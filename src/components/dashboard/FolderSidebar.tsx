import React, { useState } from 'react';
import { Folder as FolderType } from '../../types/simulation';
import { Folder, FolderX, Layers, Plus, Pencil, Trash2 } from 'lucide-react';

interface Props {
  folders: FolderType[];
  selectedFolderId: string | null; // null = All, 'none' = Uncategorized
  totalCount: number;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onDropSimulation: (simulationId: string, folderId: string | null) => void;
}

function getDraggedSimulationId(e: React.DragEvent): string | null {
  return (
    e.dataTransfer.getData('application/x-simulation-id') ||
    e.dataTransfer.getData('text/plain') ||
    null
  );
}

export const FolderSidebar: React.FC<Props> = ({
  folders,
  selectedFolderId,
  totalCount,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropSimulation,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null); // folder id, or 'none'

  const navItemClasses = (isActive: boolean, isDropTarget?: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
      isDropTarget
        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-400/60 ring-2 ring-indigo-500/40'
        : isActive
        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
    }`;

  return (
    <aside className="w-full md:w-56 shrink-0 flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1 mb-1">
        <h4 className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">Folders</h4>
        <button
          type="button"
          onClick={onCreateFolder}
          className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
          title="New Folder"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <button type="button" onClick={() => onSelectFolder(null)} className={navItemClasses(selectedFolderId === null)}>
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">All Simulations</span>
        <span className="text-[10px] font-mono text-slate-500">{totalCount}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFolder('none')}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverTarget('none');
        }}
        onDragLeave={() => setDragOverTarget((t) => (t === 'none' ? null : t))}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverTarget(null);
          const simId = getDraggedSimulationId(e);
          if (simId) onDropSimulation(simId, null);
        }}
        className={navItemClasses(selectedFolderId === 'none', dragOverTarget === 'none')}
      >
        <FolderX className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">Uncategorized</span>
      </button>

      {folders.length > 0 && <div className="h-px bg-slate-800/80 my-1.5" />}

      {folders.map((folder) => (
        <div
          key={folder.id}
          onMouseEnter={() => setHoveredId(folder.id)}
          onMouseLeave={() => setHoveredId(null)}
          className="relative group"
        >
          <button
            type="button"
            onClick={() => onSelectFolder(folder.id)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverTarget(folder.id);
            }}
            onDragLeave={() => setDragOverTarget((t) => (t === folder.id ? null : t))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverTarget(null);
              const simId = getDraggedSimulationId(e);
              if (simId) onDropSimulation(simId, folder.id);
            }}
            className={navItemClasses(selectedFolderId === folder.id, dragOverTarget === folder.id)}
          >
            <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: folder.color }} />
            <span className="flex-1 text-left truncate">{folder.name}</span>
            <span
              className={`text-[10px] font-mono text-slate-500 transition-opacity ${hoveredId === folder.id ? 'opacity-0' : 'opacity-100'}`}
            >
              {folder.simulation_count}
            </span>
          </button>

          {hoveredId === folder.id && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameFolder(folder);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700"
                title="Rename Folder"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder);
                }}
                className="p-1 rounded-md text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10"
                title="Delete Folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </aside>
  );
};
