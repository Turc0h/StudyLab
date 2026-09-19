import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Cpu,
  Sparkles,
  HelpCircle,
  FileQuestion,
  Award,
  Layers,
  Send,
  RefreshCw,
  Copy,
  Check,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  checkOllamaStatus,
  getStoredOllamaConfig,
  saveStoredOllamaConfig,
  type OllamaStatus,
  type ChatMessage,
} from "../../platform/ai/ollamaClient";
import {
  executeAcademicQuery,
  saveAiStudySessionRecord,
  RECOMMENDED_LOCAL_MODELS,
  type AiStudyMode,
} from "../../features/ai-bridge/localAiEngine";

interface LocalAiMethodProps {
  onSessionFinished?: () => void;
}

export const LocalAiMethod: React.FC<LocalAiMethodProps> = ({ onSessionFinished }) => {
  // Mode selection
  const [activeMode, setActiveMode] = useState<AiStudyMode>("socratic_tutor");

  // Ollama Connection & Settings
  const [config, setConfig] = useState(() => getStoredOllamaConfig());
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Interaction State
  const [inputPrompt, setInputPrompt] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [startTime] = useState<number>(Date.now());

  const responseBottomRef = useRef<HTMLDivElement>(null);

  // Check Ollama on mount
  useEffect(() => {
    void handleCheckConnection();
  }, []);

  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      const res = await checkOllamaStatus(config.host);
      setStatus(res);
      if (res.isRunning && res.models.length > 0) {
        // If preferredModel is not installed, select first available
        if (!res.models.some((m) => m.name === config.preferredModel)) {
          const updated = { ...config, preferredModel: res.models[0].name };
          setConfig(updated);
          saveStoredOllamaConfig(updated);
        }
      }
    } catch {
      setStatus({ isRunning: false, host: config.host, models: [] });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveConfig = () => {
    saveStoredOllamaConfig(config);
    setShowConfig(false);
    void handleCheckConnection();
  };

  const handleSendQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;

    const userText = inputPrompt.trim();
    setInputPrompt("");
    setIsGenerating(true);
    setStreamedText("");
    setSessionSaved(false);

    // Update chat history if in socratic tutor mode
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: "user", content: userText }];
    if (activeMode === "socratic_tutor") {
      setChatHistory(updatedHistory);
    }

    try {
      const result = await executeAcademicQuery({
        mode: activeMode,
        prompt: userText,
        contextNotes: contextNotes.trim() || undefined,
        history: activeMode === "socratic_tutor" ? chatHistory : undefined,
        onChunk: (_token, accumulated) => {
          setStreamedText(accumulated);
          responseBottomRef.current?.scrollIntoView({ behavior: "smooth" });
        },
      });

      setStreamedText(result.text);

      if (activeMode === "socratic_tutor") {
        setChatHistory([...updatedHistory, { role: "assistant", content: result.text }]);
      }
    } catch (err: any) {
      setStreamedText(`Error al procesar la consulta: ${err.message || "Fallo de comunicación local"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyResult = () => {
    if (!streamedText) return;
    navigator.clipboard.writeText(streamedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSession = async () => {
    if (sessionSaved) return;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    await saveAiStudySessionRecord(
      activeMode,
      Math.max(60, elapsed),
      activeMode,
    );
    setSessionSaved(true);
  };

  const handleClearHistory = () => {
    setChatHistory([]);
    setStreamedText("");
    setSessionSaved(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-400" />
            <h1 className="font-serif text-2xl font-bold text-text-primary">
              Tutor IA Local & Puente Ollama
            </h1>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Inteligencia artificial 100% privada, ejecutada localmente en tu máquina sin enviar datos a la nube ni consumir saldo.
          </p>
        </div>

        {/* Status indicator & Settings button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-surface-2 px-3 py-1.5 rounded-lg border border-border-subtle">
            {status?.isRunning ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">
                  Ollama Conectado ({config.preferredModel})
                </span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-amber-300">
                  Simulador Offline Activo
                </span>
              </>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs flex items-center gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Configurar</span>
          </Button>
        </div>
      </div>

      {/* Config Drawer / Modal if open */}
      {showConfig && (
        <Card className="p-5 border-indigo-500/40 bg-bg-surface-2 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              Parámetros de Conexión Ollama Local
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setShowConfig(false)}>
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-text-secondary">Host del Servidor:</label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full p-2 bg-bg-surface-3 rounded border border-border-subtle text-text-primary font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-secondary">Modelo Preferido:</label>
              <input
                type="text"
                value={config.preferredModel}
                onChange={(e) => setConfig({ ...config, preferredModel: e.target.value })}
                placeholder="llama3.2"
                className="w-full p-2 bg-bg-surface-3 rounded border border-border-subtle text-text-primary font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-secondary">Temperatura ({config.temperature}):</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full mt-2"
              />
            </div>
          </div>

          {/* Recommended Models Pills */}
          <div className="space-y-2 pt-2 border-t border-border-subtle">
            <span className="text-xs font-semibold text-text-muted">Modelos Recomendados para Estudio:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {RECOMMENDED_LOCAL_MODELS.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setConfig({ ...config, preferredModel: m.name })}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    config.preferredModel === m.name
                      ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                      : "bg-bg-surface-3 border-border-subtle text-text-secondary hover:border-indigo-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs">{m.name}</span>
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      {m.parameterSize}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1 line-clamp-2">{m.recommendedFor}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckConnection}
              disabled={isChecking}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={isChecking ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              <span>Probar Conexión</span>
            </Button>

            <Button size="sm" variant="primary" onClick={handleSaveConfig} className="text-xs bg-indigo-600 hover:bg-indigo-500">
              Guardar Configuración
            </Button>
          </div>
        </Card>
      )}

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveMode("socratic_tutor")}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
            activeMode === "socratic_tutor"
              ? "bg-indigo-950/30 border-indigo-500/60 shadow-sm"
              : "bg-bg-surface-2 border-border-subtle hover:border-indigo-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <HelpCircle className={`h-5 w-5 ${activeMode === "socratic_tutor" ? "text-indigo-400" : "text-text-muted"}`} />
            <Badge variant="neutral" className="text-[10px]">Tutor</Badge>
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary">Tutor Socrático</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Guía por preguntas sin revelar la respuesta directa.</p>
          </div>
        </button>

        <button
          onClick={() => setActiveMode("exam_question_generator")}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
            activeMode === "exam_question_generator"
              ? "bg-purple-950/30 border-purple-500/60 shadow-sm"
              : "bg-bg-surface-2 border-border-subtle hover:border-purple-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <FileQuestion className={`h-5 w-5 ${activeMode === "exam_question_generator" ? "text-purple-400" : "text-text-muted"}`} />
            <Badge variant="neutral" className="text-[10px]">Examen</Badge>
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary">Generador de Parcial</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Crea preguntas múltiple opción, desarrollo y casos.</p>
          </div>
        </button>

        <button
          onClick={() => setActiveMode("rubric_evaluator")}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
            activeMode === "rubric_evaluator"
              ? "bg-emerald-950/30 border-emerald-500/60 shadow-sm"
              : "bg-bg-surface-2 border-border-subtle hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <Award className={`h-5 w-5 ${activeMode === "rubric_evaluator" ? "text-emerald-400" : "text-text-muted"}`} />
            <Badge variant="neutral" className="text-[10px]">Corrector</Badge>
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary">Evaluador de Rúbricas</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Calificación 0-10 con fortalezas y respuesta 10/10.</p>
          </div>
        </button>

        <button
          onClick={() => setActiveMode("flashcard_generator")}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
            activeMode === "flashcard_generator"
              ? "bg-amber-950/30 border-amber-500/60 shadow-sm"
              : "bg-bg-surface-2 border-border-subtle hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <Layers className={`h-5 w-5 ${activeMode === "flashcard_generator" ? "text-amber-400" : "text-text-muted"}`} />
            <Badge variant="neutral" className="text-[10px]">FSRS</Badge>
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary">Extracción de Flashcards</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Convierte apuntes en tarjetas Q/A atómicas.</p>
          </div>
        </button>
      </div>

      {/* Main Workspace (Split View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Context / Material Input */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                Material de Estudio / Apuntes (Opcional):
              </span>
              {contextNotes && (
                <button
                  onClick={() => setContextNotes("")}
                  className="text-[10px] text-text-muted hover:text-text-primary"
                >
                  Limpiar
                </button>
              )}
            </div>
            <textarea
              rows={7}
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder="Pegá aquí un párrafo de bibliografía, fallo judicial, paper médico o apunte de clase que sirva de contexto para la IA..."
              className="w-full text-xs p-3 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-indigo-500 resize-y"
            />
            <p className="text-[11px] text-text-muted">
              El motor enviará estos apuntes a tu modelo local para que responda con fundamento en tu programa.
            </p>
          </Card>

          {/* Prompt Input Form */}
          <Card className="p-4 border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                {activeMode === "socratic_tutor"
                  ? "¿Qué tema o duda querés razonar?"
                  : activeMode === "exam_question_generator"
                  ? "Especifique el tema sobre el cual generar preguntas:"
                  : activeMode === "rubric_evaluator"
                  ? "Tu respuesta escrita a evaluar:"
                  : "Material o tema para generar flashcards:"}
              </span>
            </div>

            <form onSubmit={handleSendQuery} className="space-y-3">
              <textarea
                rows={4}
                required
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={
                  activeMode === "socratic_tutor"
                    ? "ej. 'No entiendo por qué en Raft se necesita quórum de mayoría en vez de consenso unánime...'"
                    : activeMode === "exam_question_generator"
                    ? "ej. 'Insuficiencia Cardíaca y uso de inhibidores SGLT2...'"
                    : activeMode === "rubric_evaluator"
                    ? "ej. 'Consigna: Imprevisión. Mi respuesta: Se aplica cuando el contrato se vuelve muy caro por inflación...'"
                    : "ej. 'Extraé las fórmulas de dilatación térmica y los coeficientes de volumen...'"
                }
                className="w-full text-xs p-3 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-indigo-500 resize-y"
              />

              <div className="flex items-center justify-between">
                {activeMode === "socratic_tutor" && chatHistory.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearHistory}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reiniciar Diálogo
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isGenerating || !inputPrompt.trim()}
                  variant="primary"
                  className="text-xs ml-auto flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isGenerating ? "Generando..." : "Consultar IA Local"}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Interactive Output / Chat Stream */}
        <div className="lg:col-span-7 flex flex-col">
          <Card className="p-5 border-border-subtle flex-1 flex flex-col justify-between space-y-4 min-h-[480px]">
            {/* Top Output Bar */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold text-text-primary">
                  Respuesta Académica Local
                </span>
                {isGenerating && (
                  <Badge variant="accent" className="text-[10px] animate-pulse">
                    Generando Tokens...
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {streamedText && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyResult}
                      className="text-xs flex items-center gap-1"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copiado" : "Copiar"}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant={sessionSaved ? "outline" : "primary"}
                      disabled={sessionSaved}
                      onClick={handleSaveSession}
                      className="text-xs flex items-center gap-1"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{sessionSaved ? "Guardado" : "Guardar Sesión"}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto max-h-[520px] space-y-4 pr-1 text-xs leading-relaxed text-text-primary">
              {activeMode === "socratic_tutor" && chatHistory.length > 0 && (
                <div className="space-y-3 mb-4">
                  {chatHistory.map((msg, mIdx) => (
                    <div
                      key={mIdx}
                      className={`p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-indigo-950/30 border border-indigo-500/30 ml-8 text-indigo-200"
                          : "bg-bg-surface-2 border border-border-subtle mr-8 whitespace-pre-wrap"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-text-muted">
                        {msg.role === "user" ? "Tú" : "Tutor Socrático"}
                      </div>
                      <div>{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Streaming Response / Current Output */}
              {streamedText ? (
                <div className="p-4 bg-bg-surface-2/80 rounded-xl border border-indigo-500/30 whitespace-pre-wrap font-sans text-xs">
                  {streamedText}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-text-muted">
                  <Bot className="h-10 w-10 text-text-muted/40" />
                  <div className="max-w-sm">
                    <p className="text-xs font-medium text-text-secondary">
                      Esperando tu consulta para activar el motor local
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">
                      Elegí un modo, redactá tu consigna o duda a la izquierda y recibí respuestas en tiempo real generadas en tu CPU/GPU local.
                    </p>
                  </div>
                </div>
              )}

              <div ref={responseBottomRef} />
            </div>

            {/* Bottom Disclaimer */}
            <div className="border-t border-border-subtle pt-3 flex items-center justify-between text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Procesado localmente con cero transmisión externa.
              </span>
              {onSessionFinished && (
                <Button size="sm" variant="outline" onClick={onSessionFinished}>
                  Volver al Catálogo
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
