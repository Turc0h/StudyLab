import { FolderPlus, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PanelGuide } from "../components/guide/PanelGuide";
import { DocumentPanel } from "../features/document-viewer/DocumentPanel";
import { Breadcrumbs } from "../features/files/Breadcrumbs";
import { FileGrid } from "../features/files/FileGrid";
import { FolderTree } from "../features/files/FolderTree";
import { NewFolderModal } from "../features/files/NewFolderModal";

export function Files() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [openFileId, setOpenFileId] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Gestor de archivos"
        title="Archivos"
        description="Año → Carrera → Materia. Subí tu material y encontralo después en dos clics."
        action={
          <div className="flex items-center gap-2">
            <PanelGuide
              id="files-overview"
              title="Gestor de Archivos Universitarios"
              whatItDoes="Almacena y organiza todos tus apuntes y libros en tu navegador (IndexedDB) de forma 100% local, sin servidores ni nubes."
              howToUse={[
                "Creá carpetas organizadas por Año → Carrera → Materia con el botón 'Nueva carpeta'.",
                "Arrastrá cualquier PDF o documento a la grilla para guardarlo al instante.",
                "Hacé clic en cualquier PDF para abrir el visor con herramientas de subrayado y notas.",
              ]}
              tip="Podés usar la plantilla de tu carrera para generar toda la estructura de materias en 1 clic."
            />
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              <FolderPlus size={16} strokeWidth={1.75} />
              Nueva carpeta
            </Button>
          </div>
        }
      >
        <div className="relative max-w-sm">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-tertiary"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de archivo…"
            className="pl-9"
          />
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Carpetas
            </span>
            <PanelGuide
              id="folder-tree"
              title="Árbol de Carpetas"
              whatItDoes="Muestra la jerarquía de tus materias y te permite navegar rápidamente entre cuatrimestres."
              howToUse={[
                "Hacé clic en cualquier carpeta para filtrar los archivos que contiene.",
                "Hacé clic en la flecha de la carpeta para desplegar subcarpetas.",
                "Hacé clic en 'Todas las carpetas' arriba para ver todo tu material junto.",
              ]}
              tip="Hacé clic derecho o usá el menú de tres puntos para eliminar carpetas que ya no curses."
              align="left"
            />
          </div>
          <FolderTree currentFolderId={currentFolderId} onSelect={setCurrentFolderId} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {!search ? (
              <Breadcrumbs folderId={currentFolderId} onNavigate={setCurrentFolderId} />
            ) : (
              <span className="text-xs text-text-muted">Resultados de búsqueda</span>
            )}
            <PanelGuide
              id="file-grid"
              title="Grilla y Subida de Archivos"
              whatItDoes="Gestiona tus documentos, permite ordenarlos por nombre/fecha/tamaño y filtrarlos por leído o pendiente."
              howToUse={[
                "Arrastrá PDFs desde tu computadora para subirlos directamente a la carpeta abierta.",
                "Usá los filtros [Todos / Pendientes / Leídos] para enfocarte en lo que falta estudiar.",
                "Hacé clic sobre cualquier tarjeta de PDF para abrir el lector interactivo.",
              ]}
              tip="Al borrar un archivo se eliminan también en cascada sus subrayados y post-its para no dejar basura."
            />
          </div>
          <FileGrid
            folderId={currentFolderId}
            searchQuery={search}
            onOpenFolder={setCurrentFolderId}
            onOpenFile={setOpenFileId}
          />
        </div>
      </div>

      <NewFolderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        parentId={currentFolderId}
      />

      {openFileId && <DocumentPanel fileId={openFileId} onClose={() => setOpenFileId(null)} />}
    </div>
  );
}
