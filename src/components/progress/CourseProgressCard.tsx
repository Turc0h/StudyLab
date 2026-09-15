import React from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Card, CardTitle } from "../ui/Card";
import { Progress } from "../ui/Progress";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { BookMarked, FolderOpen, CheckCircle2, FileText, ArrowRight } from "lucide-react";

export const CourseProgressCard: React.FC = () => {
  const folders = useLiveQuery(() => db.folders.toArray()) ?? [];
  const files = useLiveQuery(() => db.files.toArray()) ?? [];

  // Agrupar archivos por carpeta
  const folderStats = folders
    .map((folder) => {
      const folderFiles = files.filter((f) => f.folderId === folder.id);
      const total = folderFiles.length;
      const completed = folderFiles.filter((f) => f.isCompleted).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: folder.id,
        name: folder.name,
        type: folder.type,
        totalFiles: total,
        completedFiles: completed,
        percent,
      };
    })
    .filter((f) => f.totalFiles > 0);

  const totalFilesAll = files.length;
  const totalCompletedAll = files.filter((f) => f.isCompleted).length;
  const overallPercent =
    totalFilesAll > 0 ? Math.round((totalCompletedAll / totalFilesAll) * 100) : 0;

  return (
    <Card elevated className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-accent-primary" />
          <CardTitle className="text-base">Progreso de Lectura por Cátedra</CardTitle>
        </div>

        {totalFilesAll > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-text-muted">
              {totalCompletedAll} de {totalFilesAll} materiales ({overallPercent}%)
            </span>
            <Badge variant={overallPercent === 100 ? "success" : "accent"}>
              {overallPercent === 100 ? "Al día" : "En progreso"}
            </Badge>
          </div>
        )}
      </div>

      {folderStats.length === 0 ? (
        <div className="py-6 text-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-bg-secondary flex items-center justify-center mx-auto text-text-muted">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif text-sm font-semibold text-text-primary">
              Aún no tienes materiales de cátedra cargados
            </p>
            <p className="font-sans text-xs text-text-muted mt-1 max-w-md mx-auto">
              Organiza tus apuntes en carpetas por materia o escanea un libro para hacer seguimiento de tu avance de lectura.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-1">
            <Link to="/files">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Ir a Archivos</span>
              </Button>
            </Link>
            <Link to="/books">
              <Button size="sm" variant="primary" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                <span>Escanear Libro</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-sans text-text-secondary">
              <span className="font-medium">Completitud Global del Cuatrimestre</span>
              <span className="font-mono font-semibold">{overallPercent}%</span>
            </div>
            <Progress value={overallPercent} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {folderStats.map((stat) => (
              <div
                key={stat.id}
                className="p-3 rounded-md border border-border-subtle bg-bg-secondary/50 flex flex-col justify-between gap-2.5 hover:border-accent-primary/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif text-xs font-semibold text-text-primary truncate" title={stat.name}>
                      {stat.name}
                    </span>
                    <span className="font-mono text-[11px] font-medium text-text-muted shrink-0">
                      {stat.percent}%
                    </span>
                  </div>
                  <span className="font-sans text-[11px] text-text-muted block mt-0.5">
                    {stat.completedFiles} de {stat.totalFiles} lecturas revisadas
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Progress value={stat.percent} />
                  <div className="flex justify-between items-center text-[10px] font-sans text-text-muted">
                    <span>
                      {stat.percent === 100 ? (
                        <span className="text-success flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Materia completada
                        </span>
                      ) : (
                        `${stat.totalFiles - stat.completedFiles} pendientes`
                      )}
                    </span>
                    <Link
                      to="/files"
                      className="text-accent-primary hover:underline flex items-center gap-0.5"
                    >
                      <span>Ver archivos</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
