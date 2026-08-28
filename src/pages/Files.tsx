import { FolderPlus, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <FolderPlus size={16} strokeWidth={1.75} />
            Nueva carpeta
          </Button>
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
        <FolderTree currentFolderId={currentFolderId} onSelect={setCurrentFolderId} />

        <div className="flex flex-col gap-4">
          {!search && <Breadcrumbs folderId={currentFolderId} onNavigate={setCurrentFolderId} />}
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
