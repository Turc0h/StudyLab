import {
  CalendarClock,
  CheckCircle2,
  Music,
  Trash2,
  Volume2,
  Database,
  HardDrive,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Gamepad2,
  Clock,
  Sparkles,
  Bell,
  Calendar,
  ExternalLink,
  EyeOff,
} from "lucide-react";
import { openFloatingIslandWindow, hideMainWindow } from "../platform/islandWindow";
import { checkOllamaStatus, type OllamaStatus } from "../platform/ai/ollamaClient";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";
import { Switch } from "../components/ui/Switch";
import { Progress } from "../components/ui/Progress";
import { BACKEND_URL } from "../config/env";
import { clsx } from "clsx";
import { resetAllLocalData } from "../db/db";
import { ambientTracks } from "../features/ambient-sound/tracks";
import { useGoogleCalendarStatus } from "../features/google-calendar/useGoogleCalendar";
import { useThemeStore } from "../stores/useThemeStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useContextEngineStore } from "../stores/useContextEngineStore";
import { useDateFormatStore, formatDateWithPattern } from "../stores/useDateFormatStore";
import { useDynamicIslandStore, type IslandReminderFrequency } from "../stores/useDynamicIslandStore";
import {
  getStorageEstimate,
  requestStoragePersistence,
  formatBytes,
  type StorageEstimateResult,
} from "../features/storage/quotaMonitor";
import {
  exportWorkspaceToZip,
  importWorkspaceFromZip,
  inspectBackupBundle,
  type BackupInspectionResult,
} from "../features/storage/workspaceBackup";
import { RestorePreviewModal } from "../components/backup/RestorePreviewModal";
import { purgeLegacyFatigueTelemetry } from "../features/study-engine/fatigueMonitor";
import { exportCoursePackage, importCoursePackage } from "../features/study-engine/coursePackage";
import { exportDeckToAnkiTsv, importCardsFromAnkiData } from "../features/fsrs/ankiInterop";
import { db } from "../db/db";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Surface padding="md" className="flex flex-col gap-5">
      <div>
        <h3 className="font-display text-sm font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {children}
    </Surface>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme,
    ambientEnabled,
    setAmbientEnabled,
    animationsEnabled,
    setAnimationsEnabled,
    reducedMotion,
    setReducedMotion,
  } = useThemeStore();
  const { dateFormat, setDateFormat } = useDateFormatStore();
  const {
    enabled: islandEnabled,
    setEnabled: setIslandEnabled,
    gameMode: islandGameMode,
    setGameMode: setIslandGameMode,
    showClock: islandShowClock,
    setShowClock: setIslandShowClock,
    showTimer: islandShowTimer,
    setShowTimer: setIslandShowTimer,
    showReminders: islandShowReminders,
    setShowReminders: setIslandShowReminders,
    reminderFrequency: islandReminderFrequency,
    setReminderFrequency: setIslandReminderFrequency,
    triggerAlert: triggerIslandAlert,
  } = useDynamicIslandStore();
  const [testAlertSuccess, setTestAlertSuccess] = useState(false);
  const notifPreferences = useNotificationStore((s) => s.preferences);
  const updateNotifPreferences = useNotificationStore((s) => s.updatePreferences);
  const {
    contextEngineEnabled,
    setContextEngineEnabled,
    heuristicHoursPerUnit,
    setHeuristicHoursPerUnit,
  } = useContextEngineStore();
  const [searchParams] = useSearchParams();
  const calendarResult = searchParams.get("calendar");
  const calendarStatus = useGoogleCalendarStatus();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const [storageEstimate, setStorageEstimate] = useState<StorageEstimateResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [purgedCount, setPurgedCount] = useState<number | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);

  // v5.12: Estados para Vista Previa e Inspección Criptográfica de Respaldos
  const [inspectionResult, setInspectionResult] = useState<BackupInspectionResult | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);

  const handleCheckOllama = async () => {
    setIsCheckingOllama(true);
    const status = await checkOllamaStatus();
    setOllamaStatus(status);
    setIsCheckingOllama(false);
  };

  useEffect(() => {
    void getStorageEstimate().then(setStorageEstimate);
  }, []);

  const handleRequestPersistence = async () => {
    const granted = await requestStoragePersistence();
    const updated = await getStorageEstimate();
    setStorageEstimate(updated);
    if (granted) {
      setBackupStatus("Persistencia de almacenamiento concedida por el navegador.");
    } else {
      setBackupStatus("El navegador no otorgó persistencia automática (depende de la política del sistema).");
    }
    setTimeout(() => setBackupStatus(null), 4000);
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    setBackupProgress(0);
    try {
      const blob = await exportWorkspaceToZip((msg, pct) => {
        setBackupStatus(msg);
        setBackupProgress(pct);
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studylab_workspace_backup_${new Date().toISOString().slice(0, 10)}.studylab-bundle`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus("¡Paquete portable (.studylab-bundle) descargado exitosamente!");
    } catch (err) {
      console.error(err);
      setBackupStatus("Error al exportar el workspace.");
    } finally {
      setIsExporting(false);
      setTimeout(() => setBackupStatus(null), 4000);
    }
  };

  const handleSelectBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsInspecting(true);
    setBackupStatus("Inspeccionando archivo y verificando firma SHA-256...");
    try {
      const inspection = await inspectBackupBundle(file);
      setSelectedBackupFile(file);
      setInspectionResult(inspection);
      setIsInspectModalOpen(true);
      setBackupStatus(null);
    } catch (err) {
      console.error("Error inspecting backup bundle:", err);
      setBackupStatus("Error al inspeccionar el paquete de respaldo. Asegúrese de que sea un archivo válido.");
      setTimeout(() => setBackupStatus(null), 5000);
    } finally {
      setIsInspecting(false);
      e.target.value = "";
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupFile) return;
    setIsImporting(true);
    setBackupProgress(0);
    try {
      const manifest = await importWorkspaceFromZip(selectedBackupFile, (msg, pct) => {
        setBackupStatus(msg);
        setBackupProgress(pct);
      });
      setBackupStatus(`¡Restauración exitosa! (${manifest.totalFiles} archivos recuperados)`);
      void getStorageEstimate().then(setStorageEstimate);
      setIsInspectModalOpen(false);
      setSelectedBackupFile(null);
      setInspectionResult(null);
    } catch (err) {
      console.error(err);
      setBackupStatus("Error al restaurar: asegúrese de que el archivo sea un respaldo válido.");
    } finally {
      setIsImporting(false);
      setTimeout(() => setBackupStatus(null), 5000);
    }
  };

  const [packageStatus, setPackageStatus] = useState<string | null>(null);
  const [ankiStatus, setAnkiStatus] = useState<string | null>(null);

  const handleExportCoursePackage = async () => {
    try {
      setPackageStatus("Generando paquete de cátedra...");
      const blob = await exportCoursePackage("catedra-gral", "Cátedra Universitaria");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `StudyLab_Paquete_Catedra_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPackageStatus("✓ Paquete exportado (excluye PDFs por derechos de autor).");
    } catch (err) {
      console.error(err);
      setPackageStatus("Error al exportar el paquete de cátedra.");
    } finally {
      setTimeout(() => setPackageStatus(null), 6000);
    }
  };

  const handleImportCoursePackage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPackageStatus("Importando paquete de cátedra...");
      const res = await importCoursePackage(file);
      setPackageStatus(`✓ Importado: ${res.importedConcepts} conceptos, ${res.importedCards} tarjetas.`);
    } catch (err) {
      console.error(err);
      setPackageStatus("Error al importar paquete de cátedra.");
    } finally {
      setTimeout(() => setPackageStatus(null), 6000);
    }
  };

  const handleExportAnki = async () => {
    try {
      setAnkiStatus("Exportando tarjetas para Anki...");
      const deck = await db.flashcardDecks.orderBy("createdAt").first();
      const deckId = deck?.id || "default";
      const tsv = await exportDeckToAnkiTsv(deckId);
      const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `StudyLab_Anki_Deck_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAnkiStatus("✓ Mazo Anki exportado con metadatos FSRS.");
    } catch (err) {
      console.error(err);
      setAnkiStatus("Error al exportar para Anki.");
    } finally {
      setTimeout(() => setAnkiStatus(null), 6000);
    }
  };

  const handleImportAnki = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAnkiStatus("Importando mazo Anki...");
      const text = await file.text();
      const res = await importCardsFromAnkiData(text, file.name.replace(/\.[^/.]+$/, ""));
      setAnkiStatus(`✓ Importadas ${res.importedCount} tarjetas preservando parámetros.`);
    } catch (err) {
      console.error(err);
      setAnkiStatus("Error al importar tarjetas de Anki.");
    } finally {
      setTimeout(() => setAnkiStatus(null), 6000);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Configuración"
        title="Configuración"
        description="Apariencia, sonido ambiente y conexión con Google Calendar."
      />

      {calendarResult === "connected" && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-muted px-4 py-2.5 text-sm text-success">
          <CheckCircle2 size={16} strokeWidth={1.75} />
          Cuenta de Google conectada.
        </div>
      )}
      {calendarResult === "error" && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-muted px-4 py-2.5 text-sm text-danger">
          No se pudo conectar con Google — revisá las credenciales en server/.env.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <SettingsSection
          title="Apariencia"
          description="El modo oscuro es el que más cuidado recibe — pensado para sesiones largas de noche."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-text-primary">Tema</span>
            <div className="flex items-center gap-2">
              <Button
                variant={theme === "dark" ? "primary" : "secondary"}
                size="sm"
                onClick={() => theme !== "dark" && toggleTheme()}
              >
                Oscuro
              </Button>
              <Button
                variant={theme === "light" ? "primary" : "secondary"}
                size="sm"
                onClick={() => theme !== "light" && toggleTheme()}
              >
                Claro
              </Button>
            </div>
          </div>
          <Switch
            id="settings-ambient"
            checked={ambientEnabled}
            onChange={setAmbientEnabled}
            label="Fondo ambiental animado"
          />
          <Switch
            id="settings-animations"
            checked={animationsEnabled}
            onChange={setAnimationsEnabled}
            label="Animaciones de interfaz (slide de menú y transiciones de pantalla)"
          />
          <Switch
            id="settings-reduced-motion"
            checked={reducedMotion}
            onChange={setReducedMotion}
            label="Animaciones reducidas (modo prefers-reduced-motion: transiciones instantáneas)"
          />
        </SettingsSection>

        <SettingsSection
          title="Formato de Fecha y Región"
          description="Personaliza cómo se muestran e ingresan las fechas en el calendario, vencimientos y notificaciones."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-text-primary">Formato de Fecha</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Vista previa de hoy:{" "}
                  <span className="text-accent-primary font-mono font-semibold px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20">
                    {formatDateWithPattern(Date.now(), dateFormat)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={dateFormat === "DD/MM/YYYY" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setDateFormat("DD/MM/YYYY")}
                >
                  DD/MM/YYYY (Día/Mes/Año)
                </Button>
                <Button
                  variant={dateFormat === "MM/DD/YYYY" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setDateFormat("MM/DD/YYYY")}
                >
                  MM/DD/YYYY (EE.UU.)
                </Button>
                <Button
                  variant={dateFormat === "YYYY-MM-DD" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setDateFormat("YYYY-MM-DD")}
                >
                  YYYY-MM-DD (ISO)
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Notificaciones y Avisos de Estudio"
          description="Controlá cómo y cuándo StudyLab te avisa sobre entregas, repasos programados y tareas de procesamiento."
        >
          <Switch
            id="settings-notif-desktop"
            checked={notifPreferences.desktopNotificationsEnabled}
            onChange={(checked) => updateNotifPreferences({ desktopNotificationsEnabled: checked })}
            label="Notificaciones nativas del sistema operativo (Windows Desktop)"
          />
          <Switch
            id="settings-notif-deepwork"
            checked={notifPreferences.urgentOnlyInDeepWork}
            onChange={(checked) => updateNotifPreferences({ urgentOnlyInDeepWork: checked })}
            label="Modo Estudio Profundo (sólo mostrar avisos urgentes durante sesiones)"
          />
        </SettingsSection>

        <SettingsSection
          title="Sonido ambiente"
          description="Reproductor discreto con pistas propias libres de derechos, o conexión a Spotify / YouTube Music. Nunca se reproduce audio con copyright servido directo desde la app."
        >
          <div className="flex items-center gap-3 text-sm text-text-tertiary">
            <Volume2 size={18} strokeWidth={1.75} />
            <span>
              {ambientTracks.length === 0
                ? "El reproductor ya funciona, pero no hay pistas cargadas todavía — agregá .mp3 libres de derechos a public/audio/."
                : `${ambientTracks.length} pista${ambientTracks.length === 1 ? "" : "s"} cargada${ambientTracks.length === 1 ? "" : "s"}.`}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="Todavía no se conectó el SDK de Spotify"
            className="self-start"
          >
            <Music size={14} strokeWidth={1.75} />
            Conectar Spotify
          </Button>
        </SettingsSection>

        <SettingsSection
          title="Google Calendar"
          description="Vencimientos y bloques de estudio sugeridos, sincronizados con tu calendario. Necesita el backend de la Fase 9 corriendo (server/) con tus propias credenciales de Google."
        >
          <div className="flex items-center justify-between gap-3 text-sm text-text-tertiary">
            <div className="flex items-center gap-3">
              <CalendarClock size={18} strokeWidth={1.75} />
              {calendarStatus === null ? (
                <span>Backend no disponible en {BACKEND_URL} — arrancalo con `cd server && npm run dev`.</span>
              ) : calendarStatus.connected ? (
                <Badge variant="success">Conectado</Badge>
              ) : calendarStatus.configured ? (
                <span>Backend arriba, todavía no conectaste tu cuenta.</span>
              ) : (
                <span>Backend arriba, pero falta cargar las credenciales en server/.env.</span>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!calendarStatus?.configured || calendarStatus.connected}
              onClick={() => {
                window.location.href = `${BACKEND_URL}/auth/google`;
              }}
            >
              {calendarStatus?.connected ? "Conectado" : "Conectar"}
            </Button>
          </div>
        </SettingsSection>

        {/* Sección: Almacenamiento Local y Persistencia */}
        <SettingsSection
          title="Almacenamiento Local y Persistencia (Local-First)"
          description="Monitoreo de cuota y persistencia para evitar que el navegador desaloje tus apuntes, PDFs o tarjetas FSRS por inactividad."
        >
          {storageEstimate && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive size={18} className="text-accent-primary" />
                  <span className="font-mono text-xs text-text-primary">
                    Uso: <strong>{formatBytes(storageEstimate.usageBytes)}</strong> de {formatBytes(storageEstimate.quotaBytes)} ({storageEstimate.usagePercentage.toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {storageEstimate.isPersisted ? (
                    <Badge variant="success" className="gap-1">
                      <ShieldCheck size={12} />
                      Almacenamiento Persistente
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle size={12} />
                        En riesgo de desalojo
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => void handleRequestPersistence()}>
                        Solicitar Persistencia
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full">
                <Progress value={Math.min(100, storageEstimate.usagePercentage)} className="h-2" />
              </div>

              {storageEstimate.isWarning && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>Has superado el 80% de la cuota del navegador. Te recomendamos exportar un respaldo en .zip para evitar pérdidas de datos.</span>
                </div>
              )}
            </div>
          )}
        </SettingsSection>

        {/* Sección: Respaldo Completo (.studylab-bundle / .zip) */}
        <SettingsSection
          title="Copia de Seguridad y Portabilidad (.studylab-bundle / .zip)"
          description="Exportá o restaurá tu entorno universitario completo (los 30 métodos de estudio, sesiones interactivas, flashcards FSRS, Motor de Contexto y archivos) con verificación criptográfica SHA-256."
        >
          {backupStatus && (
            <div className="p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/30 text-xs text-accent-primary font-mono flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Database size={14} />
                <span>{backupStatus}</span>
              </div>
              {backupProgress > 0 && backupProgress < 100 && (
                <Progress value={backupProgress} className="h-1.5" />
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              disabled={isExporting || isImporting || isInspecting}
              onClick={() => void handleExportZip()}
              className="gap-1.5 text-xs font-mono cursor-pointer"
            >
              <Download size={14} />
              <span>{isExporting ? "Exportando..." : "Exportar Paquete (.studylab-bundle)"}</span>
            </Button>

            <label className="inline-flex">
              <input
                type="file"
                accept=".studylab-bundle,.zip"
                onChange={(e) => void handleSelectBackupFile(e)}
                disabled={isExporting || isImporting || isInspecting}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-2 hover:bg-bg-surface-3 text-xs font-mono text-text-primary cursor-pointer transition-colors">
                <Upload size={14} />
                <span>
                  {isInspecting
                    ? "Verificando SHA-256..."
                    : isImporting
                    ? "Restaurando..."
                    : "Inspeccionar y Restaurar Respaldo"}
                </span>
              </span>
            </label>
          </div>
        </SettingsSection>

        {/* Sección: Circulación entre Estudiantes e Interoperabilidad (Sección 32-BIS) */}
        <SettingsSection
          title="Circulación e Interoperabilidad Académica (Sección 32-BIS)"
          description="Exportá materias completas como Paquetes de Cátedra para circular entre compañeros (WhatsApp/Drive) o sincronizá con Anki conservando los parámetros FSRS."
        >
          {packageStatus && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs font-semibold text-primary">
              {packageStatus}
            </div>
          )}
          {ankiStatus && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
              {ankiStatus}
            </div>
          )}

          {/* Paquetes de Cátedra */}
          <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-text-main">Paquetes de Cátedra (.zip)</h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Incluye grafo de conceptos, prerrequisitos, flashcards limpias y metadatos de bibliografía. Los libros protegidos por derechos de autor se referencian por metadatos (cada alumno aporta su ejemplar).
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleExportCoursePackage()}
                className="gap-1.5 text-xs font-mono cursor-pointer"
              >
                <Download size={14} />
                <span>Exportar Paquete de Cátedra (.zip)</span>
              </Button>

              <label className="inline-flex">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => void handleImportCoursePackage(e)}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-3 hover:bg-bg-surface-1 text-xs font-mono text-text-primary cursor-pointer transition-colors">
                  <Upload size={14} />
                  <span>Importar Paquete de Cátedra</span>
                </span>
              </label>
            </div>
          </div>

          {/* Interoperabilidad con Anki */}
          <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface-2 p-4">
            <div>
              <h4 className="text-xs font-bold text-text-main">Interoperabilidad con Anki (.tsv / txt)</h4>
              <p className="text-[11px] text-text-muted mt-0.5">
                Exportá tus tarjetas con clozes e indicadores FSRS o importá colecciones existentes sin reiniciar su estabilidad.
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExportAnki()}
                className="gap-1.5 text-xs font-mono cursor-pointer"
              >
                <Download size={14} />
                <span>Exportar Mazo para Anki (.txt)</span>
              </Button>

              <label className="inline-flex">
                <input
                  type="file"
                  accept=".txt,.tsv,.json"
                  onChange={(e) => void handleImportAnki(e)}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-3 hover:bg-bg-surface-1 text-xs font-mono text-text-primary cursor-pointer transition-colors">
                  <Upload size={14} />
                  <span>Importar Mazo desde Anki</span>
                </span>
              </label>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Consola de Verificación QA (Sección 32-QUATER)"
          description="Centro de diagnóstico en vivo para auditar el estado real de cada algoritmo, modelo de maestría, motor de búsqueda híbrida y subsistema de StudyLab CognitiveOS v5.2."
        >
          <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface-2 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-text-main">Diagnóstico Completo del Sistema (/qa)</h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Ejecutá pruebas interactivas en vivo sobre las 31 capacidades cognitivas y subsistemas sin salir del navegador.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/qa")}
                className="gap-1.5 text-xs font-mono cursor-pointer shrink-0"
              >
                <ShieldCheck size={14} />
                <span>Abrir Consola QA (/qa)</span>
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Motor de Contexto (Context Engine - v5.1)"
          description="Capa opcional de contexto para coordinar proyectos de estudio, bloqueo de horarios semanales y estimaciones de horas. Es 100% local-first y ningún dato se transfiere a servidores externos."
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-text-primary">Habilitar Motor de Contexto</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Despliega la pestaña y módulo de contexto en la barra lateral para articular materiales y horas de estudio.
                </p>
              </div>
              <Switch
                checked={contextEngineEnabled}
                onChange={(val: boolean) => void setContextEngineEnabled(val)}
              />
            </div>

            {contextEngineEnabled && (
              <div className="rounded-xl border border-border-subtle bg-bg-surface-2 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-text-main">Heurística Base de Horas por Unidad</h4>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Horas de estudio sugeridas por cada unidad o capítulo teórico nuevo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="20"
                      value={heuristicHoursPerUnit}
                      onChange={(e) => void setHeuristicHoursPerUnit(parseFloat(e.target.value) || 3)}
                      className="w-20 rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                    <span className="text-xs text-text-muted">hs/unidad</span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/context")}
                    className="text-xs gap-1.5"
                  >
                    <span>Abrir Motor de Contexto (/context)</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Sección de Servidor Local de Inteligencia Artificial (Ollama) */}
        <SettingsSection
          title="Inteligencia Artificial Local (Ollama - localhost:11434)"
          description="Conectá modelos libres y locales (Llama 3.2, Mistral, Phi-3) ejecutados en tu propia máquina mediante Ollama. Cero llamadas a APIs externas y 100% privado."
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-accent-primary" />
                  Estado del Servidor Ollama
                </span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Verificá si el demonio de Ollama está escuchando peticiones en el puerto estándar 11434.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckOllama}
                disabled={isCheckingOllama}
                className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className={isCheckingOllama ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                <span>{isCheckingOllama ? "Comprobando..." : "Comprobar Conexión con Ollama"}</span>
              </Button>
            </div>

            {ollamaStatus && (
              <div className="rounded-xl border border-border-subtle bg-bg-surface-2 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">Resultado:</span>
                    {ollamaStatus.isRunning ? (
                      <Badge variant="success">Ollama Conectado y Listo</Badge>
                    ) : (
                      <Badge variant="neutral">Ollama No Detectado</Badge>
                    )}
                  </div>
                  {ollamaStatus.version && (
                    <span className="text-xs text-text-muted">v{ollamaStatus.version}</span>
                  )}
                </div>

                {ollamaStatus.isRunning ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-text-secondary">
                      Modelos locales disponibles ({ollamaStatus.models.length}):
                    </p>
                    {ollamaStatus.models.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ollamaStatus.models.map((m) => (
                          <Badge key={m.digest || m.name} variant="accent">
                            {m.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-muted italic">
                        No hay modelos descargados aún. Podés instalar uno ejecutando: <code className="text-accent-primary">ollama run llama3.2</code>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-text-secondary space-y-1.5">
                    <p className="text-text-muted">
                      No se detectó un servidor escuchando en <code className="text-text-primary">http://localhost:11434</code>.
                    </p>
                    <div className="rounded bg-bg-primary p-2 text-[11px] font-mono text-text-secondary">
                      1. Descargá e instalá Ollama desde <span className="text-accent-primary">ollama.com</span>.<br />
                      2. Abrí una terminal PowerShell y ejecutá: <span className="text-accent-primary font-bold">ollama run llama3.2</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Datos"
          description="Todo se guarda localmente en este navegador (IndexedDB), nada sale a un servidor. Si quedaron carpetas, archivos o marcas de prueba de antes, podés borrar todo y arrancar de cero."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-text-primary">Borrar todos los datos locales</span>
            {confirmingReset ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary">
                  Esto borra carpetas, archivos, subrayados y post-its. No se puede deshacer.
                </span>
                <Button variant="secondary" size="sm" onClick={() => setConfirmingReset(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" size="sm" onClick={() => void resetAllLocalData()}>
                  Sí, borrar todo
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setConfirmingReset(true)}>
                <Trash2 size={14} strokeWidth={1.75} />
                Reiniciar aplicación
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-border-subtle mt-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-text-primary block">
                  Privacidad y Telemetría Ética (Sección 26-BIS)
                </span>
                <span className="text-xs text-text-tertiary">
                  StudyLab no registra varianza de tecleo ni patrones de pulsación. Podés purgar registros heredados de versiones previas.
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const count = await purgeLegacyFatigueTelemetry();
                  setPurgedCount(count);
                }}
                className="shrink-0 text-xs font-mono cursor-pointer"
              >
                <ShieldCheck size={14} className="text-success mr-1" />
                Purgar telemetría heredada
              </Button>
            </div>
            {purgedCount !== null && (
              <span className="text-xs font-mono text-success">
                ✓ Se eliminaron {purgedCount} registros antiguos de telemetría de tecleo. Privacidad asegurada.
              </span>
            )}
          </div>
        </SettingsSection>

        {/* Sección de Formato de Fecha y Región */}
        <SettingsSection
          title="Formato de Fecha y Región"
          description="Elegí cómo querés visualizar y cargar las fechas en los calendarios, vencimientos de materias y agendas de examen."
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent-primary" />
                  Patrón de Fecha Predeterminado
                </span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Por defecto configurado en DD/MM/YYYY para Argentina y Latinoamérica.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setDateFormat(fmt)}
                    className={clsx(
                      "px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer border",
                      dateFormat === fmt
                        ? "bg-accent-primary text-white border-accent-primary shadow-sm"
                        : "bg-bg-surface-2 text-text-secondary border-border-subtle hover:text-text-primary hover:border-accent-primary"
                    )}
                  >
                    {fmt} {fmt === "DD/MM/YYYY" && "(Regional)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-surface-2 p-3 flex items-center justify-between text-xs">
              <span className="text-text-muted">Vista previa con la fecha de hoy:</span>
              <span className="font-mono font-bold text-accent-primary bg-accent-primary/10 px-2.5 py-1 rounded">
                {formatDateWithPattern(new Date(), dateFormat)}
              </span>
            </div>
          </div>
        </SettingsSection>

        {/* Sección de Isla Dinámica Estudiantil */}
        <SettingsSection
          title="Isla Dinámica Estudiantil (Dynamic Island)"
          description="Cápsula flotante interactiva superior para ver el temporizador de estudio, el reloj y recordatorios inteligentes con animaciones suaves (Atajo: Ctrl+I / Cmd+I)."
        >
          <div className="space-y-4">
            {/* Switch Principal Habilitar */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-primary" />
                  Habilitar Isla Dinámica en Pantalla
                </span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Muestra la píldora interactiva centrada en la parte superior de la aplicación.
                </p>
              </div>
              <Switch checked={islandEnabled} onChange={setIslandEnabled} />
            </div>

            {islandEnabled && (
              <div className="rounded-xl border border-border-subtle bg-bg-surface-2 p-4 space-y-4">
                {/* Modo Juego / No Molestar */}
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div>
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <Gamepad2 className="h-3.5 w-3.5 text-rose-400" />
                      Modo "No Molestar / Juego"
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Oculta la isla por completo para no distraer ni consumir recursos visuales. Solo se muestra si surge una alerta urgente o examen inmediato.
                    </p>
                  </div>
                  <Switch checked={islandGameMode} onChange={setIslandGameMode} />
                </div>

                {/* Opciones de contenido visibles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-border-subtle">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-surface-1 border border-border-subtle">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-accent-primary" />
                      Reloj Digital
                    </span>
                    <Switch checked={islandShowClock} onChange={setIslandShowClock} />
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-surface-1 border border-border-subtle">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-accent-primary" />
                      Temporizador
                    </span>
                    <Switch checked={islandShowTimer} onChange={setIslandShowTimer} />
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-surface-1 border border-border-subtle">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-accent-primary" />
                      Recordatorios
                    </span>
                    <Switch checked={islandShowReminders} onChange={setIslandShowReminders} />
                  </div>
                </div>

                {/* Frecuencia de Recordatorios Periódicos */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-text-primary">
                      Frecuencia de Recordatorios Inteligentes
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Intervalo para avisos de descanso visual (regla 20-20-20), hidratación y postura activa.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([15, 30, 45, 60, 0] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setIslandReminderFrequency(freq as IslandReminderFrequency)}
                        className={clsx(
                          "px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer border",
                          islandReminderFrequency === freq
                            ? "bg-accent-primary text-white border-accent-primary shadow-xs"
                            : "bg-bg-surface-1 text-text-secondary border-border-subtle hover:text-text-primary"
                        )}
                      >
                        {freq === 0 ? "Desactivado" : `${freq}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botón para probar la animación y alerta */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-text-muted">
                    Podés disparar una alerta de prueba para ver la expansión animada de la isla en vivo:
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      triggerIslandAlert({
                        title: "¡Examen de Álgebra en 2 días!",
                        subtitle: "Recordatorio StudyLab en la Isla Dinámica.",
                        level: "warning",
                      });
                      setTestAlertSuccess(true);
                      setTimeout(() => setTestAlertSuccess(false), 3000);
                    }}
                    className="text-xs gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
                    <span>{testAlertSuccess ? "¡Alerta enviada!" : "Probar Alerta en Isla"}</span>
                  </Button>
                </div>

                {/* Desprender al Escritorio (Modo Flotante Independiente) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border-subtle">
                  <div>
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                      Modo Flotante en el Escritorio (Always-on-Top)
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Abre la Isla Dinámica en una pequeña ventana transparente e independiente que permanece visible en tu pantalla de Windows incluso al minimizar la aplicación.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void openFloatingIslandWindow()}
                    className="text-xs gap-1.5 cursor-pointer shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Abrir en Escritorio</span>
                  </Button>
                </div>

                {/* Ocultar en Íconos Ocultos (Bandeja de Sistema) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border-subtle">
                  <div>
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <EyeOff className="h-3.5 w-3.5 text-accent-primary" />
                      Segundo Plano e Íconos Ocultos (Bandeja del Sistema)
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Oculta la ventana principal de StudyLab en los íconos ocultos de Windows (junto al reloj). Al cerrar la ventana o pulsar este botón, la aplicación no se cierra: sigue funcionando en segundo plano y la Isla Flotante permanece en tu pantalla.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void hideMainWindow()}
                    className="text-xs gap-1.5 cursor-pointer shrink-0"
                  >
                    <EyeOff className="h-3.5 w-3.5 text-accent-primary" />
                    <span>Ocultar a Íconos Ocultos</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>
      </div>

      {/* v5.12: Modal de Inspección y Vista Previa de Respaldo */}
      <RestorePreviewModal
        isOpen={isInspectModalOpen}
        onClose={() => {
          if (!isImporting) {
            setIsInspectModalOpen(false);
            setSelectedBackupFile(null);
            setInspectionResult(null);
          }
        }}
        inspection={inspectionResult}
        onConfirmRestore={() => void handleConfirmRestore()}
        restoring={isImporting}
        restoreProgress={backupProgress}
        restoreMessage={backupStatus || "Restaurando..."}
      />
    </div>
  );
}
