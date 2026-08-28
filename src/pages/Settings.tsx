import { CalendarClock, CheckCircle2, Music, Trash2, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";
import { Switch } from "../components/ui/Switch";
import { BACKEND_URL } from "../config/env";
import { resetAllLocalData } from "../db/db";
import { ambientTracks } from "../features/ambient-sound/tracks";
import { useGoogleCalendarStatus } from "../features/google-calendar/useGoogleCalendar";
import { useThemeStore } from "../stores/useThemeStore";

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
  const { theme, toggleTheme, ambientEnabled, setAmbientEnabled } = useThemeStore();
  const [searchParams] = useSearchParams();
  const calendarResult = searchParams.get("calendar");
  const calendarStatus = useGoogleCalendarStatus();
  const [confirmingReset, setConfirmingReset] = useState(false);

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
        </SettingsSection>
      </div>
    </div>
  );
}
