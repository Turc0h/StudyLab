import { AmbientBackground } from "../../components/AmbientBackground";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Surface } from "../../components/ui/Surface";
import { Switch } from "../../components/ui/Switch";
import { useSyncTheme } from "../../hooks/useSyncTheme";
import { useThemeStore } from "../../stores/useThemeStore";
import { ColorSwatch } from "./ColorSwatch";
import { Section } from "./Section";

const spacingSteps = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32];
const radiusSteps: { token: string; label: string; className: string }[] = [
  { token: "--radius-sm", label: "sm · 6px", className: "rounded-sm" },
  { token: "--radius-md", label: "md · 10px", className: "rounded-md" },
  { token: "--radius-lg", label: "lg · 14px", className: "rounded-lg" },
  { token: "--radius-xl", label: "xl · 20px", className: "rounded-xl" },
];

export function StyleKit() {
  useSyncTheme();
  const { theme, toggleTheme, ambientEnabled, setAmbientEnabled } = useThemeStore();

  return (
    <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-16 px-6 py-16">
      <AmbientBackground />
      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-border-subtle pb-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
              StudyLab · Fase 0
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-text-primary">
              Sistema de diseño
            </h1>
            <p className="max-w-xl text-sm text-text-secondary">
              Panel de control silencioso, no dashboard de videojuego. Paleta pensada para
              sesiones de estudio largas: bajo estímulo visual, contraste sutil, alertas
              reservadas para lo que realmente importa.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </Button>
            <Switch
              id="ambient-toggle"
              checked={ambientEnabled}
              onChange={setAmbientEnabled}
              label="Fondo ambiental"
            />
          </div>
        </div>
      </header>

      {/* 01 — Color */}
      <Section
        index="01"
        title="Paleta"
        description="Fondo grafito casi negro, superficies elevadas sin bordes duros, un único acento frío de baja saturación. Rojo y naranja quedan reservados a alertas reales."
      >
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="mb-3 text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Fondo
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              <ColorSwatch
                varName="--color-bg-base"
                label="bg-base"
                role="Fondo raíz"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-bg-base-alt"
                label="bg-base-alt"
                role="Degradé ambiental"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-bg-surface"
                label="bg-surface"
                role="Cards, paneles"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-bg-surface-2"
                label="bg-surface-2"
                role="Elevación 2"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-bg-surface-hover"
                label="bg-surface-hover"
                role="Hover de superficie"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Bordes y texto
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              <ColorSwatch
                varName="--color-border-subtle"
                label="border-subtle"
                role="Separación casi imperceptible"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-border"
                label="border"
                role="Separación visible"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-text-primary"
                label="text-primary"
                role="Texto principal"
                theme={theme}
                textOn={theme === "dark" ? "dark" : "light"}
              />
              <ColorSwatch
                varName="--color-text-secondary"
                label="text-secondary"
                role="Texto secundario"
                theme={theme}
              />
              <ColorSwatch
                varName="--color-text-tertiary"
                label="text-tertiary"
                role="Placeholder, disabled"
                theme={theme}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Acento — cian apagado
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              <ColorSwatch varName="--color-accent" label="accent" role="Primario" theme={theme} />
              <ColorSwatch
                varName="--color-accent-hover"
                label="accent-hover"
                role="Hover"
                theme={theme}
              />
              <ColorSwatch
                varName="--color-accent-active"
                label="accent-active"
                role="Active/pressed"
                theme={theme}
              />
              <ColorSwatch
                varName="--color-accent-muted"
                label="accent-muted"
                role="Fondo tintado (nav activo)"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-accent-contrast"
                label="accent-contrast"
                role="Texto sobre acento"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Estados — solo para alertas reales
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              <ColorSwatch varName="--color-danger" label="danger" role="Racha rota" theme={theme} />
              <ColorSwatch
                varName="--color-danger-muted"
                label="danger-muted"
                role="Fondo de alerta"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch
                varName="--color-warning"
                label="warning"
                role="Tiempo agotado"
                theme={theme}
                textOn={theme === "dark" ? "dark" : "light"}
              />
              <ColorSwatch
                varName="--color-warning-muted"
                label="warning-muted"
                role="Fondo de aviso"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
              <ColorSwatch varName="--color-success" label="success" role="Racha activa" theme={theme} />
              <ColorSwatch
                varName="--color-success-muted"
                label="success-muted"
                role="Fondo de éxito"
                theme={theme}
                textOn={theme === "dark" ? "light" : "dark"}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* 02 — Tipografía */}
      <Section
        index="02"
        title="Tipografía"
        description="Space Grotesk para títulos y UI (aire técnico/geométrico). Inter para lectura prolongada — notas, apuntes, resúmenes. JetBrains Mono para cifras: timers, contadores, rachas."
      >
        <div className="flex flex-col gap-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Surface padding="md">
              <p className="mb-1 text-xs text-text-tertiary">--font-display</p>
              <p className="font-display text-2xl font-semibold tracking-tight text-text-primary">
                Space Grotesk
              </p>
              <p className="mt-2 text-xs text-text-secondary">Títulos, nav, botones, labels</p>
            </Surface>
            <Surface padding="md">
              <p className="mb-1 text-xs text-text-tertiary">--font-body</p>
              <p className="font-body text-2xl font-semibold tracking-tight text-text-primary">
                Inter
              </p>
              <p className="mt-2 text-xs text-text-secondary">Notas, apuntes, texto largo</p>
            </Surface>
            <Surface padding="md">
              <p className="mb-1 text-xs text-text-tertiary">--font-mono</p>
              <p className="font-mono text-2xl font-semibold tracking-tight text-text-primary tabular-nums">
                25:00
              </p>
              <p className="mt-2 text-xs text-text-secondary">Timers, cifras, datos</p>
            </Surface>
          </div>

          <div className="flex flex-col gap-4">
            {(
              [
                ["text-4xl", "4xl"],
                ["text-3xl", "3xl"],
                ["text-2xl", "2xl"],
                ["text-xl", "xl"],
                ["text-lg", "lg"],
                ["text-base", "base"],
                ["text-sm", "sm"],
                ["text-xs", "xs"],
              ] as const
            ).map(([cls, name]) => (
              <div key={name} className="flex items-baseline gap-4 border-b border-border-subtle pb-3">
                <span className="w-10 shrink-0 font-mono text-xs text-text-tertiary">{name}</span>
                <span className={`font-display text-text-primary ${cls}`}>
                  Metodología de estudio activa
                </span>
              </div>
            ))}
          </div>

          <Surface padding="lg" className="max-w-xl">
            <p className="mb-2 text-xs text-text-tertiary">Párrafo de lectura — font-body, 1.6 line-height</p>
            <p className="font-body text-base leading-relaxed text-text-primary">
              La técnica Feynman consiste en explicar un concepto con palabras simples, como si se
              lo enseñaras a alguien sin conocimientos previos. Al intentar simplificar, aparecen
              los huecos en la propia comprensión — esos huecos son exactamente lo que hay que
              volver a estudiar.
            </p>
          </Surface>
        </div>
      </Section>

      {/* 03 — Espaciado */}
      <Section
        index="03"
        title="Espaciado"
        description="Escala de 4px de Tailwind, usada de forma consistente en todo el layout."
      >
        <div className="flex flex-col gap-2">
          {spacingSteps.map((step) => (
            <div key={step} className="flex items-center gap-4">
              <span className="w-12 shrink-0 font-mono text-xs text-text-tertiary tabular-nums">
                {step * 4}px
              </span>
              <div className="h-3 rounded-sm bg-accent-muted" style={{ width: `${step * 4}px` }} />
              <span className="font-mono text-xs text-text-tertiary">space-{step}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 04 — Radios */}
      <Section
        index="04"
        title="Radios de borde"
        description="Geométricos y discretos — nunca completamente cuadrados, nunca exageradamente redondeados."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {radiusSteps.map((r) => (
            <div key={r.token} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-16 border border-border bg-bg-surface-2 ${r.className}`} />
              <span className="font-mono text-xs text-text-tertiary">{r.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 05 — Componentes */}
      <Section index="05" title="Componentes base">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Iniciar sesión</Button>
            <Button variant="secondary">Configurar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">Eliminar racha</Button>
            <Button variant="primary" disabled>
              Deshabilitado
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">Borrador</Badge>
            <Badge variant="accent">Activo</Badge>
            <Badge variant="success">Racha: 12 días</Badge>
            <Badge variant="warning">Vence mañana</Badge>
            <Badge variant="danger">Racha rota</Badge>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Surface padding="md">
              <h3 className="font-display text-sm font-semibold text-text-primary">
                Anatomía I
              </h3>
              <p className="mt-1 text-sm text-text-secondary">Cornell Notes · 3 sesiones</p>
              <div className="mt-4 flex items-center justify-between">
                <Badge variant="accent">En progreso</Badge>
                <span className="font-mono text-xs text-text-tertiary tabular-nums">45:00</span>
              </div>
            </Surface>
            <Surface padding="md" className="flex flex-col gap-3">
              <label htmlFor="kit-input" className="text-xs font-medium text-text-secondary">
                Buscar archivo
              </label>
              <Input id="kit-input" placeholder="apuntes-cardio.pdf" />
            </Surface>
          </div>
        </div>
      </Section>

      <footer className="border-t border-border-subtle pt-8 text-xs text-text-tertiary">
        StudyLab — Fase 0 · Sistema de diseño y setup. Revisar dirección visual antes de avanzar
        a la Fase 1 (layout y navegación).
      </footer>
    </div>
  );
}
