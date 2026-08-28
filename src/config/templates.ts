/**
 * Plantillas de carrera: nombrás la carrera y el año, se generan las carpetas de materias
 * típicas de ese año. Pensado para cargar más configuraciones a futuro — agregar una carrera
 * acá es lo único que hace falta, el resto del flujo (Files.tsx) ya sabe leerlas.
 */
export interface CareerTemplate {
  id: string;
  name: string;
  subjectsByYear: Record<number, string[]>;
}

export const careerTemplates: CareerTemplate[] = [
  {
    id: "medicina",
    name: "Medicina",
    subjectsByYear: {
      1: ["Anatomía", "Histología", "Biología Celular", "Química Biológica"],
      2: ["Fisiología", "Bioquímica", "Farmacología I", "Microbiología"],
      3: ["Patología", "Farmacología II", "Semiología", "Inmunología"],
    },
  },
  {
    id: "ingenieria-informatica",
    name: "Ingeniería Informática",
    subjectsByYear: {
      1: ["Álgebra", "Análisis Matemático I", "Programación I", "Física I"],
      2: ["Análisis Matemático II", "Programación II", "Estructuras de Datos", "Física II"],
      3: ["Bases de Datos", "Sistemas Operativos", "Redes", "Probabilidad y Estadística"],
    },
  },
  {
    id: "psicologia",
    name: "Psicología",
    subjectsByYear: {
      1: ["Psicología General", "Biología del Comportamiento", "Historia de la Psicología"],
      2: ["Psicología del Desarrollo", "Psicoanálisis", "Neurociencias"],
      3: ["Psicopatología", "Psicología Social", "Técnicas de Evaluación"],
    },
  },
];

export function getSubjectsForYear(templateId: string, year: number): string[] {
  const template = careerTemplates.find((t) => t.id === templateId);
  return template?.subjectsByYear[year] ?? [];
}
