import React, { useState, useEffect, useRef } from "react";
import {
  Scale,
  Clock,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  ShieldAlert,
  Printer,
  Save,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  PRESET_DEFENSE_SCENARIOS,
  evaluateBoardPerformance,
  detectOralSmoke,
  saveFinalBoardSessionRecord,
  type DefenseScenario,
  type JuryMember,
  type BoardQuestionRound,
  type StudentBoardAnswer,
  type BoardEvaluationRecord,
} from "../../features/oral-defense/finalBoardEngine";

interface FinalBoardMethodProps {
  onSessionFinished?: () => void;
}

export const FinalBoardMethod: React.FC<FinalBoardMethodProps> = ({ onSessionFinished }) => {
  const [selectedScenario, setSelectedScenario] = useState<DefenseScenario>(
    PRESET_DEFENSE_SCENARIOS[0],
  );
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<StudentBoardAnswer[]>([]);
  const [currentAnswerText, setCurrentAnswerText] = useState<string>("");
  const [isDefenseActive, setIsDefenseActive] = useState<boolean>(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);
  const [evaluationRecord, setEvaluationRecord] = useState<BoardEvaluationRecord | null>(null);
  const [sessionSaved, setSessionSaved] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Timer de la sesión
  useEffect(() => {
    if (isDefenseActive && !evaluationRecord) {
      timerRef.current = setInterval(() => {
        setElapsedTimeSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDefenseActive, evaluationRecord]);

  const activeRound: BoardQuestionRound | undefined =
    selectedScenario.rounds[currentRoundIndex];
  const activeJury: JuryMember | undefined = selectedScenario.jury.find(
    (j) => j.id === activeRound?.juryMemberId,
  );

  // Speech Recognition Setup
  const toggleVoiceRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta Web Speech Recognition para dictado directo. Puedes tipear tu respuesta oral.");
      return;
    }

    if (isRecordingVoice) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecordingVoice(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + " ";
          }
          setCurrentAnswerText(transcript);
        };

        recognition.onerror = () => {
          setIsRecordingVoice(false);
        };

        recognition.onend = () => {
          setIsRecordingVoice(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecordingVoice(true);
      } catch (err) {
        console.error("Error al iniciar reconocimiento de voz:", err);
        setIsRecordingVoice(false);
      }
    }
  };

  // Web Speech TTS para que el jurado hable
  const speakJuryQuestion = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !activeRound) return;
    window.speechSynthesis.cancel();

    if (isSpeakingQuestion) {
      setIsSpeakingQuestion(false);
      return;
    }

    const textToSpeak = `${activeJury?.name} pregunta: ${activeRound.questionText}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "es-ES";
    utterance.rate = 0.95;

    // Ajustar tono según arquetipo docente
    if (activeJury?.archetype === "dogmatic") utterance.pitch = 0.85;
    else if (activeJury?.archetype === "practical") utterance.pitch = 1.05;
    else utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeakingQuestion(true);
    utterance.onend = () => setIsSpeakingQuestion(false);
    utterance.onerror = () => setIsSpeakingQuestion(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStartDefense = () => {
    setIsDefenseActive(true);
    setCurrentRoundIndex(0);
    setAnswers([]);
    setCurrentAnswerText("");
    setElapsedTimeSec(0);
    setEvaluationRecord(null);
    setSessionSaved(false);
  };

  const handleSubmitAnswer = () => {
    if (!activeRound || !activeJury) return;

    if (isSpeakingQuestion && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }
    if (isRecordingVoice && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecordingVoice(false);
    }

    const newAnswer: StudentBoardAnswer = {
      roundNumber: activeRound.roundNumber,
      juryMemberId: activeJury.id,
      answerText: currentAnswerText,
      timeSpentSec: elapsedTimeSec,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setCurrentAnswerText("");

    // Si aún quedan rondas, avanzar a la siguiente
    if (currentRoundIndex + 1 < selectedScenario.rounds.length) {
      setCurrentRoundIndex((prev) => prev + 1);
    } else {
      // Fin del coloquio: computar Acta
      const finalEval = evaluateBoardPerformance(
        selectedScenario,
        updatedAnswers,
        "Estudiante Universitario",
      );
      setEvaluationRecord(finalEval);
    }
  };

  const handleSaveToHistory = async () => {
    if (!evaluationRecord || sessionSaved) return;
    try {
      await saveFinalBoardSessionRecord(
        selectedScenario.title,
        elapsedTimeSec,
        evaluationRecord.finalWeightedGrade,
      );
      setSessionSaved(true);
      if (onSessionFinished) onSessionFinished();
    } catch (err) {
      console.error("Error al guardar sesión del tribunal:", err);
    }
  };

  const handlePrintActa = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Detección de humo en vivo mientras escribe/habla
  const liveSmoke = detectOralSmoke(
    currentAnswerText,
    activeRound?.modelAnswerKeyPoints || [],
    activeRound?.smokeThresholdWords || 30,
  );

  const wordCount = currentAnswerText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="warning" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
              <Scale className="w-3.5 h-3.5 mr-1" />
              Tribunal Colegiado & Defensa Oral
            </Badge>
            <Badge variant="neutral" className="text-muted-foreground">
              v5.26
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Tribunal de Examen Final & Defensa de Tesis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simulador de jurado multidocente con arquetipos de cátedra (Dogmático, Práctico y Metodológico) y emisión de Acta Oficial.
          </p>
        </div>

        {/* Selector de Casos */}
        {!isDefenseActive && !evaluationRecord && (
          <div className="flex items-center gap-3">
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                const found = PRESET_DEFENSE_SCENARIOS.find((s) => s.id === e.target.value);
                if (found) setSelectedScenario(found);
              }}
              className="bg-card text-foreground border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {PRESET_DEFENSE_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.career} — {s.title}
                </option>
              ))}
            </select>
            <Button onClick={handleStartDefense} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Scale className="w-4 h-4 mr-2" />
              Constituir Tribunal
            </Button>
          </div>
        )}
      </div>

      {/* ESTADO 1: Presentación del Tribunal y Escenario (Antes de Iniciar) */}
      {!isDefenseActive && !evaluationRecord && (
        <div className="space-y-6">
          <Card className="p-6 border-border/60 bg-card/60 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {selectedScenario.career}
                </span>
                <h2 className="text-xl font-bold text-foreground mt-1">{selectedScenario.title}</h2>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  <strong>Tema de Examen / Tesis:</strong> {selectedScenario.thesisOrTopic}
                </p>
              </div>
              <Badge variant="neutral" className="border-primary/30 text-primary bg-primary/5">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Límite: {selectedScenario.timeLimitMinutes} min
              </Badge>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-4 rounded-lg border border-border/30">
              {selectedScenario.context}
            </p>
          </Card>

          {/* Banco de Jurados */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Miembros del Tribunal Evaluador
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedScenario.jury.map((jury) => (
                <Card
                  key={jury.id}
                  className="p-5 border-border/50 bg-card/40 flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${jury.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                      >
                        {jury.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(-2)
                          .join("")}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{jury.name}</h4>
                        <p className="text-xs text-muted-foreground">{jury.academicTitle}</p>
                      </div>
                    </div>
                    <Badge variant="neutral" className="text-xs mb-3 border-border/60 bg-muted/20">
                      {jury.archetypeTitle}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {jury.focusDescription}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleStartDefense}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base font-semibold shadow-lg"
            >
              Comenzar Defensa Oral ante el Tribunal
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ESTADO 2: Tribunal en Sesión Activa */}
      {isDefenseActive && !evaluationRecord && activeRound && activeJury && (
        <div className="space-y-6">
          {/* Barra de Jurados con Estado Activo */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {selectedScenario.jury.map((jury) => {
              const isInterrogating = jury.id === activeJury.id;
              const hasAnswered = answers.some((a) => a.juryMemberId === jury.id);

              return (
                <Card
                  key={jury.id}
                  className={`p-3 md:p-4 border transition-all ${
                    isInterrogating
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30"
                      : hasAnswered
                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                      : "border-border/40 bg-card/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br ${jury.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                    >
                      {jury.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(-2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs md:text-sm text-foreground truncate">
                        {jury.name}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                        {isInterrogating ? (
                          <span className="text-primary font-medium">Interrogando ahora...</span>
                        ) : hasAnswered ? (
                          <span className="text-emerald-400">Ronda Respondida</span>
                        ) : (
                          "En espera"
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Consigna de la Ronda Actual */}
          <Card className="p-6 border-border/80 bg-card/80 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Ronda {activeRound.roundNumber} de {selectedScenario.rounds.length}
                </Badge>
                <Badge variant="neutral" className="text-xs">
                  {activeJury.archetypeTitle}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(elapsedTimeSec / 60)}:{(elapsedTimeSec % 60).toString().padStart(2, "0")}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg md:text-xl font-semibold text-foreground leading-snug">
                  "{activeRound.questionText}"
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={speakJuryQuestion}
                  className={isSpeakingQuestion ? "border-primary text-primary" : ""}
                >
                  <Volume2 className="w-4 h-4 mr-1.5" />
                  {isSpeakingQuestion ? "Detener" : "Escuchar"}
                </Button>
              </div>

              {/* Trampa o Foco Crítico */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <strong>Foco de Exigencia del Jurado:</strong> {activeRound.trapOrPitfall}
                </div>
              </div>
            </div>

            {/* Área de Respuesta del Alumno */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tu defensa oral (dictado por voz o redacción continua):</span>
                <span className={wordCount >= (activeRound.smokeThresholdWords || 30) ? "text-emerald-400" : "text-amber-400"}>
                  {wordCount} palabras (mínimo recomendado: {activeRound.smokeThresholdWords || 30})
                </span>
              </div>

              <textarea
                value={currentAnswerText}
                onChange={(e) => setCurrentAnswerText(e.target.value)}
                placeholder="Argumenta tu respuesta con terminología técnica, leyes/fisiopatología/principios y resolución certera sin rodeos..."
                rows={5}
                className="w-full bg-background border border-border/80 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed resize-none text-foreground placeholder:text-muted-foreground/60"
              />

              {/* Alerta de humo en tiempo real */}
              {liveSmoke.isSmoke && currentAnswerText.length > 20 && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-xs text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>
                    <strong>Detector de Evasivas:</strong> {liveSmoke.reasons[0]}
                  </span>
                </div>
              )}

              {/* Controles de Entrada */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleVoiceRecording}
                  className={isRecordingVoice ? "border-rose-500 text-rose-400 bg-rose-500/10 animate-pulse" : ""}
                >
                  {isRecordingVoice ? (
                    <>
                      <MicOff className="w-4 h-4 mr-1.5" />
                      Detener Dictado
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-1.5" />
                      Dictar con Micrófono
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!currentAnswerText.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {currentRoundIndex + 1 < selectedScenario.rounds.length
                    ? "Enviar Respuesta y Siguiente Jurado"
                    : "Finalizar Exposición y Emitir Acta"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ESTADO 3: Acta Formal de Examen Final (Resultados y Deliberación) */}
      {evaluationRecord && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="p-6 md:p-8 border-border bg-card shadow-2xl relative overflow-hidden">
            {/* Sello de Marca de Agua / Decoración Universitaria */}
            <div className="border-b-2 border-border/80 pb-6 mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-3 text-primary">
                <Scale className="w-8 h-8" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-wide uppercase">
                Acta Oficial de Examen Final & Defensa de Grado
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Tribunal Académico Examinador Colegiado — {selectedScenario.career}
              </p>
              <div className="flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground mt-3">
                <span>Acta Nº: {evaluationRecord.actaNumber}</span>
                <span>•</span>
                <span>Fecha: {new Date(evaluationRecord.timestamp).toLocaleDateString()}</span>
                <span>•</span>
                <span>Alumno: {evaluationRecord.studentName}</span>
              </div>
            </div>

            {/* Veredicto y Calificación */}
            <div className="p-6 rounded-xl border border-border/80 bg-muted/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Dictamen Final del Tribunal
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mt-1">
                  {evaluationRecord.verdictLabel}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Cátedra: {evaluationRecord.scenarioTitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center px-6 py-3 bg-background border border-border/60 rounded-xl shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Promedio Colegiado
                  </span>
                  <span className="text-3xl font-extrabold text-primary">
                    {evaluationRecord.finalWeightedGrade.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground block">/ 10</span>
                </div>
              </div>
            </div>

            {/* Calificaciones Individuales de los 3 Jurados */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Veredictos Individuales de Cátedra
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(evaluationRecord.juryScores).map((scoreItem, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-border/60 bg-card/60 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {scoreItem.juryName}
                        </span>
                        <Badge
                          variant={scoreItem.score >= 7.0 ? "success" : "error"}
                          className="text-xs"
                        >
                          {scoreItem.score.toFixed(1)} / 10
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mb-2 font-medium">
                        Dimensión: {scoreItem.dimension}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        "{scoreItem.comment}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fortalezas y Observaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Fortalezas Dictaminadas
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  {evaluationRecord.strengths.length > 0 ? (
                    evaluationRecord.strengths.map((str, i) => <li key={i}>{str}</li>)
                  ) : (
                    <li>No se registraron fortalezas destacadas en esta instancia.</li>
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Observaciones y Puntos a Reforzar
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  {evaluationRecord.criticalDeficits.length > 0 ? (
                    evaluationRecord.criticalDeficits.map((def, i) => <li key={i}>{def}</li>)
                  ) : (
                    <li>Defensa impecable sin observaciones negativas.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Acciones de Cierre */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={handlePrintActa}>
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir Acta de Examen
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveToHistory}
                  disabled={sessionSaved}
                  className={sessionSaved ? "text-emerald-400 border-emerald-500/40" : ""}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {sessionSaved ? "Acta Guardada en Historial" : "Guardar en Historial"}
                </Button>

                <Button size="sm" onClick={handleStartDefense} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Nueva Simulación
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FinalBoardMethod;
