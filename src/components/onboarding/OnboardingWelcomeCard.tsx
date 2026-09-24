import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import {
  FolderOpen,
  GraduationCap,
  RotateCcw,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { db } from "../../db/db";

const DISMISS_KEY = "studylab_onboarding_dismissed";

export const OnboardingWelcomeCard: React.FC = () => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return localStorage.getItem(DISMISS_KEY) === "true";
  });
  const [hasData, setHasData] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function checkData() {
      try {
        const [fileCount, sessionCount] = await Promise.all([
          db.files.count(),
          db.sessions.count(),
        ]);
        if (isMounted) {
          // Si el estudiante ya tiene archivos o sesiones, no mostramos el banner
          setHasData(fileCount > 0 || sessionCount > 0);
        }
      } catch {
        // En caso de error de lectura, asumimos que tiene datos para no estorbar
        if (isMounted) setHasData(true);
      }
    }
    checkData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  if (dismissed || hasData) {
    return null;
  }

  return (
    <Card
      elevated
      className="p-5 border-accent-primary/30 bg-gradient-to-r from-accent-primary/5 via-bg-elevated to-bg-elevated relative overflow-hidden"
    >
      <button
        type="button"
        onClick={handleDismiss}
        title="Descartar guía de bienvenida"
        aria-label="Descartar guía de bienvenida"
        className="absolute top-3 right-3 p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-2 text-accent-primary font-sans text-xs font-semibold uppercase tracking-wider">
        <Sparkles size={14} />
        <span>Primeros Pasos en StudyLab</span>
      </div>

      <h3 className="font-serif text-lg font-semibold text-text-primary mt-1">
        Bienvenido a tu estación de estudio universitario
      </h3>
      <p className="font-sans text-xs text-text-secondary mt-1 max-w-2xl">
        StudyLab es 100% local-first: todo tu material, tarjetas FSRS y notas viven en tu navegador.
        Para comenzar a estudiar de forma sistemática, sigue estos 3 pasos:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* Paso 1 */}
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-surface flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
              <FolderOpen size={15} />
            </div>
            <span className="font-sans text-xs font-semibold text-text-primary">1. Biblioteca</span>
          </div>
          <p className="font-sans text-[11px] text-text-muted mt-2">
            Crea tus materias o genera la plantilla de tu carrera para organizar tus apuntes.
          </p>
          <Link to="/files" className="mt-3">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1">
              <span>Ir a Biblioteca</span>
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>

        {/* Paso 2 */}
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-surface flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
              <GraduationCap size={15} />
            </div>
            <span className="font-sans text-xs font-semibold text-text-primary">2. Estudiar</span>
          </div>
          <p className="font-sans text-[11px] text-text-muted mt-2">
            Abre tu PDF o apuntes en el Workspace y consulta dudas con el Catedrático Socrático.
          </p>
          <Link to="/workspace" className="mt-3">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1">
              <span>Abrir Workspace</span>
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>

        {/* Paso 3 */}
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-surface flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
              <RotateCcw size={15} />
            </div>
            <span className="font-sans text-xs font-semibold text-text-primary">3. Repasar</span>
          </div>
          <p className="font-sans text-[11px] text-text-muted mt-2">
            Consolida tu memoria con el mazo de repaso espaciado FSRS y técnicas cognitivas.
          </p>
          <Link to="/methods" className="mt-3">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1">
              <span>Ver Métodos</span>
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
