import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Flame,
  Award,
  BookOpen,
  Filter,
  PlusCircle,
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Save,
  HelpCircle,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type {
  PastExamPaper,
  PastExamQuestion,
  MockExamSubmission,
  MockExamResult,
} from "../../features/past-exams/pastExamsEngine";
import {
  getAllPastExams,
  getAvailableSubjects,
  calculateParetoTopicAnalysis,
  generateCompositeHighYieldExam,
  gradeMockExamSubmission,
  saveMockExamSession,
  saveCustomExam,
} from "../../features/past-exams/pastExamsEngine";

interface PastExamsMethodProps {
  onSessionFinished?: () => void;
}

export const PastExamsMethod: React.FC<PastExamsMethodProps> = ({ onSessionFinished }) => {
  const [activeTab, setActiveTab] = useState<"repository" | "pareto" | "simulator">("repository");

  // Repository & Filters
  const [allExams, setAllExams] = useState<PastExamPaper[]>(() => getAllPastExams());
  const subjects = useMemo(() => getAvailableSubjects(), []);
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || "Farmacología & Cardiología Clínica");
  const [inspectedExam, setInspectedExam] = useState<PastExamPaper | null>(null);

  // New Exam Modal
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamSubject, setNewExamSubject] = useState(selectedSubject);
  const [newExamProfessor, setNewExamProfessor] = useState("");
  const [newExamTerm, setNewExamTerm] = useState("1° Cuatrimestre 2024");
  const [newExamYear, setNewExamYear] = useState(2024);
  const [newExamTime, setNewExamTime] = useState(60);
  const [newExamQuestionsText, setNewExamQuestionsText] = useState("");

  // Simulator State
  const [currentExam, setCurrentExam] = useState<PastExamPaper | null>(null);
  const [submissionAnswers, setSubmissionAnswers] = useState<MockExamSubmission["answers"]>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<MockExamResult | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Pareto analysis for selected subject
  const currentSubjectExams = useMemo(() => {
    return allExams.filter((e) => e.subject.toLowerCase() === selectedSubject.toLowerCase());
  }, [allExams, selectedSubject]);

  const paretoData = useMemo(() => {
    return calculateParetoTopicAnalysis(currentSubjectExams);
  }, [currentSubjectExams]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || remainingSeconds <= 0 || examFinished) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, remainingSeconds, examFinished]);

  const startExamSimulator = (exam: PastExamPaper) => {
    setCurrentExam(exam);
    setSubmissionAnswers({});
    setRemainingSeconds(exam.timeLimitMinutes * 60);
    setTimerActive(true);
    setExamFinished(false);
    setEvaluationResult(null);
    setSessionSaved(false);
    setActiveTab("simulator");
  };

  const handleStartCompositeExam = () => {
    try {
      const composite = generateCompositeHighYieldExam(selectedSubject, 4);
      startExamSimulator(composite);
    } catch {
      alert("No se pudo generar el simulacro compuesto.");
    }
  };

  const handleFinishExam = () => {
    if (!currentExam) return;
    setTimerActive(false);
    setExamFinished(true);

    const elapsed = currentExam.timeLimitMinutes * 60 - remainingSeconds;
    const submission: MockExamSubmission = {
      examId: currentExam.id,
      answers: submissionAnswers,
      elapsedSeconds: Math.max(1, elapsed),
    };

    const res = gradeMockExamSubmission(currentExam, submission);
    setEvaluationResult(res);
  };

  const handleSaveSession = async () => {
    if (!currentExam || !evaluationResult || sessionSaved) return;
    const elapsed = currentExam.timeLimitMinutes * 60 - remainingSeconds;
    await saveMockExamSession(currentExam.title, Math.max(60, elapsed), evaluationResult.totalScore);
    setSessionSaved(true);
  };

  const handleSaveCustomExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim() || !newExamSubject.trim()) return;

    // Parse simple line-separated questions if provided
    const lines = newExamQuestionsText.split("\n").filter((l) => l.trim().length > 0);
    const parsedQuestions: PastExamQuestion[] = lines.map((line, idx) => ({
      id: `custom-q-${Date.now()}-${idx}`,
      questionText: line.trim(),
      topic: "Tema General de Cátedra",
      type: "essay" as const,
      points: 2.5,
      rubricCriteria: ["Claridad conceptual y terminología técnica", "Fundamentación y ejemplos"],
      modelAnswer: "Respuesta modelo ingresada por el estudiante.",
      difficulty: 3 as const,
    }));

    if (parsedQuestions.length === 0) {
      parsedQuestions.push({
        id: `custom-q-${Date.now()}-0`,
        questionText: "Pregunta principal a desarrollo del examen.",
        topic: "Tema Evaluado",
        type: "essay",
        points: 10,
        rubricCriteria: ["Desarrollo completo"],
        modelAnswer: "Criterio de aprobación de la cátedra.",
        difficulty: 3,
      });
    }

    const totalPts = parsedQuestions.reduce((a, b) => a + b.points, 0);

    const customExamObj: PastExamPaper = {
      id: `custom_${Date.now()}`,
      title: newExamTitle.trim(),
      subject: newExamSubject.trim(),
      chairOrProfessor: newExamProfessor.trim() || "Cátedra Docente",
      term: newExamTerm.trim(),
      examType: "parcial_1",
      year: Number(newExamYear) || 2024,
      totalMaxPoints: totalPts,
      passingScore: Math.round(totalPts * 0.6),
      timeLimitMinutes: Number(newExamTime) || 60,
      questions: parsedQuestions,
      sourceNotes: "Parcial cargado manualmente por el estudiante.",
    };

    saveCustomExam(customExamObj);
    setAllExams(getAllPastExams());
    setIsAddingExam(false);
    setNewExamTitle("");
    setNewExamQuestionsText("");
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-400" />
            <h1 className="font-serif text-2xl font-bold text-text-primary">
              Banco de Parciales Anteriores & Predictor Pareto High-Yield
            </h1>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Analizá parciales tomados por cátedras universitarias, predecí los temas con 80% de recurrencia y entrená con simulacros cronometrados.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-bg-surface-2 p-1 rounded-lg border border-border-subtle">
          <button
            onClick={() => setActiveTab("repository")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "repository"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Banco de Exámenes</span>
          </button>
          <button
            onClick={() => setActiveTab("pareto")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "pareto"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Predictor Pareto (80/20)</span>
          </button>
          <button
            onClick={() => setActiveTab("simulator")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "simulator"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>Simulador {currentExam ? `(${currentExam.questions.length} pts)` : ""}</span>
          </button>
        </div>
      </div>

      {/* Subject Filter Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-surface-2/60 p-3 rounded-lg border border-border-subtle">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <Filter className="h-4 w-4 text-text-muted flex-shrink-0" />
          <span className="text-xs font-medium text-text-secondary">Cátedra / Materia:</span>
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedSubject === subj
                  ? "bg-indigo-500 text-white shadow"
                  : "bg-bg-surface-3 text-text-secondary hover:text-text-primary"
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartCompositeExam}
            className="text-xs flex items-center gap-1.5 border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Simulacro Compuesto High-Yield</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingExam(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Cargar Parcial</span>
          </Button>
        </div>
      </div>

      {/* TAB 1: REPOSITORY */}
      {activeTab === "repository" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentSubjectExams.map((exam) => (
              <Card
                key={exam.id}
                className="p-4 border-border-subtle hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="neutral" className="text-xs font-mono">
                      {exam.term}
                    </Badge>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
                      {exam.year}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-text-primary text-base line-clamp-2">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">{exam.chairOrProfessor}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {exam.questions.length} preguntas
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {exam.timeLimitMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" />
                      {exam.totalMaxPoints} pts
                    </span>
                  </div>

                  {exam.sourceNotes && (
                    <p className="text-xs text-text-muted italic bg-bg-surface-3/50 p-2 rounded">
                      "{exam.sourceNotes}"
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-border-subtle mt-4 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInspectedExam(inspectedExam?.id === exam.id ? null : exam)}
                    className="text-xs flex items-center gap-1"
                  >
                    {inspectedExam?.id === exam.id ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        <span>Ocultar</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>Ver Preguntas</span>
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => startExamSimulator(exam)}
                    className="text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Rendir Simulacro</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Inspected Exam Question Drawer */}
          {inspectedExam && (
            <Card className="p-5 border-indigo-500/40 bg-bg-surface-2/90 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div>
                  <h4 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    Consignas Oficiales: {inspectedExam.title}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {inspectedExam.chairOrProfessor} • {inspectedExam.term}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setInspectedExam(null)}>
                  Cerrar
                </Button>
              </div>

              <div className="space-y-4">
                {inspectedExam.questions.map((q, idx) => (
                  <div key={q.id} className="p-3.5 bg-bg-surface-3 rounded-lg border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-indigo-400">
                        Pregunta #{idx + 1} ({q.points} pts)
                      </span>
                      <Badge variant="neutral" className="text-[10px]">
                        {q.type === "multiple_choice" ? "Multiple Choice" : q.type === "practical_case" ? "Caso Práctico" : "Desarrollo"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{q.questionText}</p>
                    <p className="text-xs text-purple-300">Tema Evaluado: {q.topic}</p>

                    {q.options && (
                      <div className="space-y-1 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`text-xs p-1.5 rounded flex items-start gap-2 ${
                              oIdx === q.correctAnswer
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium"
                                : "text-text-secondary bg-bg-surface-2/40"
                            }`}
                          >
                            <span className="font-mono">{String.fromCharCode(65 + oIdx)}.</span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.modelAnswer && (
                      <div className="mt-2 p-2 bg-indigo-950/20 border border-indigo-500/20 rounded text-xs text-text-secondary">
                        <span className="font-semibold text-indigo-300">Criterio Oficial de Cátedra: </span>
                        {q.modelAnswer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: PARETO 80/20 HIGH-YIELD TOPIC FORECASTER */}
      {activeTab === "pareto" && (
        <div className="space-y-6">
          {/* Pareto Law Metric Highlight */}
          <Card className="p-5 border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-bg-surface to-purple-950/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                  Concentración de Puntos (Pareto 80/20)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-3xl font-extrabold text-indigo-400">
                    {paretoData.pointsShareTop20}%
                  </span>
                  <span className="text-xs text-text-secondary">de los puntos de examen</span>
                </div>
                <p className="text-xs text-text-muted">
                  concentrados en apenas el top 20% de los temas de la cátedra.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                  Temas Críticos High-Yield
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-3xl font-extrabold text-emerald-400">
                    {paretoData.highYieldTopics.length}
                  </span>
                  <span className="text-xs text-text-secondary">de {paretoData.totalTopics} temas totales</span>
                </div>
                <p className="text-xs text-text-muted">
                  Aparecen en más del 70% de los parciales analizados.
                </p>
              </div>

              <div className="flex flex-col justify-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleStartCompositeExam}
                  className="w-full text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Simulacro Compuesto Pareto</span>
                </Button>
                <p className="text-[11px] text-center text-text-muted">
                  Selecciona preguntas ponderadas por probabilidad histórica.
                </p>
              </div>
            </div>
          </Card>

          {/* High-Yield Ranked Topics Table */}
          <Card className="p-5 border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-text-primary text-base">
                  Matriz de Recurrencia y Probabilidad de Evaluación
                </h3>
              </div>
              <span className="text-xs text-text-muted">
                {currentSubjectExams.length} parciales evaluados
              </span>
            </div>

            <div className="space-y-3">
              {paretoData.allRankedTopics.map((topicStat, index) => {
                const isCritical = topicStat.yieldCategory === "CRITICAL_HIGH_YIELD";
                const isHigh = topicStat.yieldCategory === "HIGH_YIELD";

                return (
                  <div
                    key={topicStat.topic}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isCritical
                        ? "bg-purple-950/20 border-purple-500/40"
                        : isHigh
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-bg-surface-2 border-border-subtle"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-text-muted w-5">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-text-primary">
                          {topicStat.topic}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCritical && (
                          <Badge variant="neutral" className="border-purple-400 text-purple-300 bg-purple-500/10 text-xs">
                            🔥 Fijo en el Parcial (≥70%)
                          </Badge>
                        )}
                        {isHigh && (
                          <Badge variant="neutral" className="border-emerald-400 text-emerald-300 bg-emerald-500/10 text-xs">
                            Muy Probable (50-69%)
                          </Badge>
                        )}
                        {topicStat.paretoTier === "top_20_percent" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                            TOP 20% PARETO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar of recurrence */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-text-secondary">
                        <span>Presente en {topicStat.paperCount} de {currentSubjectExams.length} exámenes</span>
                        <span className="font-bold">{topicStat.paperPercentage}% de probabilidad</span>
                      </div>
                      <div className="h-2 w-full bg-bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isCritical
                              ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                              : isHigh
                              ? "bg-emerald-500"
                              : "bg-border-subtle"
                          }`}
                          style={{ width: `${topicStat.paperPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-text-muted">
                        <span>Puntos totales otorgados históricamente: {topicStat.totalPointsAssigned} pts</span>
                        <span>Promedio por aparición: {topicStat.averagePointsPerAppearance} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          {!currentExam ? (
            <Card className="p-8 text-center space-y-4 border-dashed border-border-subtle">
              <GraduationCap className="h-12 w-12 text-indigo-400 mx-auto" />
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-semibold text-text-primary text-base">
                  Ningún examen seleccionado para simulación
                </h3>
                <p className="text-xs text-text-secondary">
                  Elegí un parcial histórico del banco o generá un simulacro compuesto con la ley de Pareto.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setActiveTab("repository")}>
                  Ver Banco de Parciales
                </Button>
                <Button variant="primary" onClick={handleStartCompositeExam} className="bg-indigo-600 hover:bg-indigo-500">
                  Generar Simulacro High-Yield
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Simulator Header & Timer Bar */}
              <Card className="p-4 border-indigo-500/40 bg-bg-surface-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" className="text-xs">
                      {currentExam.term}
                    </Badge>
                    <span className="text-xs text-indigo-300 font-semibold">{currentExam.chairOrProfessor}</span>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-text-primary">{currentExam.title}</h2>
                </div>

                <div className="flex items-center gap-4">
                  {/* Countdown Timer */}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${
                      remainingSeconds < 300 && remainingSeconds > 0
                        ? "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse"
                        : "bg-bg-surface-3 border-border-subtle text-text-primary"
                    }`}
                  >
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span>{formatTime(remainingSeconds)}</span>
                  </div>

                  {!examFinished ? (
                    <Button
                      variant="primary"
                      onClick={handleFinishExam}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Entregar y Calificar</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => startExamSimulator(currentExam)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reintentar</span>
                    </Button>
                  )}
                </div>
              </Card>

              {/* Evaluation Result Report (if finished) */}
              {examFinished && evaluationResult && (
                <Card
                  className={`p-5 border space-y-4 animate-in fade-in duration-300 ${
                    evaluationResult.passed
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-red-500/40 bg-red-950/20"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {evaluationResult.passed ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-red-400" />
                        )}
                        <h3 className="font-serif text-xl font-bold text-text-primary">
                          {evaluationResult.passed ? "¡Parcial Aprobado!" : "Examen no Aprobado"}
                        </h3>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Umbral de aprobación de cátedra: {currentExam.passingScore} / {currentExam.totalMaxPoints} puntos
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-serif text-3xl font-extrabold text-text-primary">
                          {evaluationResult.totalScore}
                        </span>
                        <span className="text-text-muted text-sm"> / {evaluationResult.maxScore} pts</span>
                        <p className="text-xs font-semibold text-text-secondary">
                          {evaluationResult.percentage}% de efectividad
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={sessionSaved ? "outline" : "primary"}
                        disabled={sessionSaved}
                        onClick={handleSaveSession}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{sessionSaved ? "Sesión Guardada" : "Guardar en Historial"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Feedback notes */}
                  <div className="space-y-2">
                    {evaluationResult.feedback.map((fb, idx) => (
                      <p key={idx} className="text-xs font-medium text-text-primary flex items-start gap-2">
                        <span className="text-indigo-400">•</span>
                        {fb}
                      </p>
                    ))}
                  </div>

                  {/* Topic breakdown list */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Desglose Diagnóstico por Tema
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {evaluationResult.topicBreakdown.map((t) => (
                        <div
                          key={t.topic}
                          className="p-2.5 bg-bg-surface-3 rounded border border-border-subtle flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-medium text-text-primary truncate">{t.topic}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-mono">
                              {t.score}/{t.maxScore} ({t.percentage}%)
                            </span>
                            <Badge
                              variant="neutral"
                              className={`text-[10px] ${
                                t.status === "mastered"
                                  ? "text-emerald-300 border-emerald-400"
                                  : t.status === "critical_gap"
                                  ? "text-red-300 border-red-400"
                                  : "text-amber-300 border-amber-400"
                              }`}
                            >
                              {t.status === "mastered"
                                ? "Dominado"
                                : t.status === "critical_gap"
                                ? "Brecha Crítica"
                                : "A Repasar"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                {currentExam.questions.map((q, qIndex) => {
                  const currentAns = submissionAnswers[q.id] || {};

                  return (
                    <Card key={q.id} className="p-5 border-border-subtle space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-indigo-400">
                              Pregunta #{qIndex + 1}
                            </span>
                            <Badge variant="neutral" className="text-[10px]">
                              {q.type === "multiple_choice"
                                ? "Opción Múltiple"
                                : q.type === "practical_case"
                                ? "Caso Práctico"
                                : "Desarrollo Teórico"}
                            </Badge>
                          </div>
                          <span className="text-xs text-text-muted">Tema: {q.topic}</span>
                        </div>
                        <span className="font-semibold text-xs text-text-primary px-2 py-0.5 rounded bg-bg-surface-3">
                          {q.points} pts
                        </span>
                      </div>

                      <p className="text-sm font-medium text-text-primary leading-relaxed">{q.questionText}</p>

                      {/* Question Content based on Type */}
                      {q.type === "multiple_choice" && q.options && (
                        <div className="space-y-2 pt-1">
                          {q.options.map((opt, oIndex) => {
                            const isSelected = currentAns.selectedOption === oIndex;
                            const isCorrect = q.correctAnswer === oIndex;

                            let optionClasses = "bg-bg-surface-3 border-border-subtle text-text-secondary hover:bg-bg-surface-2";
                            if (isSelected) {
                              optionClasses = "bg-indigo-500/20 border-indigo-500 text-indigo-200 font-medium";
                            }
                            if (examFinished) {
                              if (isCorrect) {
                                optionClasses = "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold";
                              } else if (isSelected && !isCorrect) {
                                optionClasses = "bg-red-500/20 border-red-500 text-red-200 font-semibold";
                              }
                            }

                            return (
                              <button
                                key={oIndex}
                                type="button"
                                disabled={examFinished}
                                onClick={() => {
                                  setSubmissionAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: {
                                      ...prev[q.id],
                                      selectedOption: oIndex,
                                    },
                                  }));
                                }}
                                className={`w-full text-left p-3 rounded-lg border text-xs flex items-start gap-3 transition-all ${optionClasses}`}
                              >
                                <span className="font-mono font-bold text-text-muted">
                                  {String.fromCharCode(65 + oIndex)}.
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Essay / Practical Case */}
                      {q.type !== "multiple_choice" && (
                        <div className="space-y-3 pt-1">
                          <textarea
                            disabled={examFinished}
                            value={currentAns.essayText || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSubmissionAnswers((prev) => ({
                                ...prev,
                                [q.id]: {
                                  ...prev[q.id],
                                  essayText: val,
                                },
                              }));
                            }}
                            placeholder="Escribí aquí tu desarrollo, fundamentación y normativa/guía aplicable..."
                            rows={4}
                            className="w-full text-xs p-3 rounded-lg bg-bg-surface-3 border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-indigo-500 resize-y"
                          />

                          {/* Rubric Checklist for self-evaluation */}
                          {q.rubricCriteria && q.rubricCriteria.length > 0 && (
                            <div className="p-3 bg-bg-surface-2/80 rounded-lg border border-border-subtle space-y-2">
                              <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                                Criterios de Corrección de la Cátedra (Marcar los conceptos incluidos):
                              </span>
                              <div className="space-y-1.5">
                                {q.rubricCriteria.map((crit, cIdx) => {
                                  const checks = currentAns.rubricChecks || [];
                                  const isChecked = !!checks[cIdx];

                                  return (
                                    <label
                                      key={cIdx}
                                      className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const newChecks = [...(currentAns.rubricChecks || [])];
                                          newChecks[cIdx] = e.target.checked;
                                          setSubmissionAnswers((prev) => ({
                                            ...prev,
                                            [q.id]: {
                                              ...prev[q.id],
                                              rubricChecks: newChecks,
                                            },
                                          }));
                                        }}
                                        className="mt-0.5 rounded border-border-subtle text-indigo-600 focus:ring-0"
                                      />
                                      <span>{crit}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Model Answer (Revealed after finish) */}
                          {examFinished && q.modelAnswer && (
                            <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg text-xs space-y-1">
                              <span className="font-semibold text-indigo-300">
                                Respuesta Modelo Oficial de Cátedra:
                              </span>
                              <p className="text-text-secondary leading-relaxed">{q.modelAnswer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-border-subtle pt-4">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("repository")}>
                  Volver al Banco
                </Button>

                {!examFinished ? (
                  <Button
                    variant="primary"
                    onClick={handleFinishExam}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Entregar y Calificar Examen</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={onSessionFinished}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <span>Finalizar y Salir</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Custom Past Exam */}
      {isAddingExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4 border-indigo-500/40 bg-bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-indigo-400" />
                Cargar Parcial Anterior
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingExam(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleSaveCustomExamSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-text-secondary">Título del Examen:</label>
                <input
                  type="text"
                  required
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  placeholder="ej. 1° Parcial Ordinario - Mayo 2024"
                  className="w-full p-2 bg-bg-surface-2 rounded border border-border-subtle text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-text-secondary">Materia / Disciplina:</label>
                  <input
                    type="text"
                    required
                    value={newExamSubject}
                    onChange={(e) => setNewExamSubject(e.target.value)}
                    className="w-full p-2 bg-bg-surface-2 rounded border border-border-subtle text-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-text-secondary">Cátedra / Profesor:</label>
                  <input
                    type="text"
                    value={newExamProfessor}
                    onChange={(e) => setNewExamProfessor(e.target.value)}
                    placeholder="ej. Cátedra Méndez"
                    className="w-full p-2 bg-bg-surface-2 rounded border border-border-subtle text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-text-secondary">Cuatrimestre:</label>
                  <input
                    type="text"
                    value={newExamTerm}
                    onChange={(e) => setNewExamTerm(e.target.value)}
                    className="w-full p-2 bg-bg-surface-2 rounded border border-border-subtle text-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-text-secondary">Año:</label>
                  <input
                    type="number"
                    value={newExamYear}
                    onChange={(e) => setNewExamYear(Number(e.target.value))}
                    className="w-full p-2 bg-bg-surface-2 rounded border border-border-subtle text-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-text-secondary">Tiempo (min):</label>
                  <input
                    type="number"
                    value={newExamTime}
                    onChange={(e) => setNewExamTime(Number(e.target.value))}
                    className="w-full p-2 bg-bg-surface-2 rounded border border-border-subtle text-text-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-text-secondary">
                  Consignas / Preguntas (una por línea):
                </label>
                <textarea
                  rows={4}
                  value={newExamQuestionsText}
                  onChange={(e) => setNewExamQuestionsText(e.target.value)}
                  placeholder="Pegá aquí las preguntas del parcial reconstruido..."
                  className="w-full p-2 bg-bg-surface-2 rounded border border-border-subtle text-text-primary resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="outline" onClick={() => setIsAddingExam(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-500">
                  Guardar en el Banco
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
