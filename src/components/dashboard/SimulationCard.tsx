import React, { useState } from 'react';
import { Folder as FolderType, SimulationSummary } from '../../types/simulation';
import { useTheme } from '../../utils/themeConfig';
import {
  Copy,
  Download,
  Trash2,
  Calendar,
  Layers,
  Folder,
  FolderX,
  Check,
} from 'lucide-react';

interface Props {
  simulation: SimulationSummary;
  folders: FolderType[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveFolder: (id: string, folderId: string | null) => void;
}

export const SimulationCard: React.FC<Props> = ({
  simulation,
  folders,
  onOpen,
  onDuplicate,
  onDelete,
  onMoveFolder,
}) => {
  const { themeColor } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const currentFolder = folders.find((f) => f.id === simulation.folder_id) || null;

  const formattedDate = new Date(simulation.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/api/simulations/${simulation.id}/export`;
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-simulation-id', simulation.id);
        e.dataTransfer.setData('text/plain', simulation.id);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onClick={() => onOpen(simulation.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={simulation.description || simulation.name}
      className="bg-surface-900/90 hover:bg-surface-900 border border-slate-800 rounded-full pl-2 pr-3 py-2 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all duration-200 group relative"
      style={{
        borderColor: isHovered ? `${themeColor}80` : '#1e293b',
        boxShadow: isHovered ? `0 8px 16px -6px ${themeColor}20` : 'none',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${themeColor}1a`, color: themeColor }}
      >
        <Layers className="w-4 h-4" />
      </div>

      {/* Name */}
      <span
        className="text-sm font-bold text-slate-100 truncate max-w-[220px] transition-colors"
        style={{ color: isHovered ? themeColor : '#f8fafc' }}
      >
        {simulation.name}
      </span>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
          style={{
            backgroundColor: `${themeColor}1a`,
            color: themeColor,
            borderColor: `${themeColor}4d`,
          }}
        >
          {simulation.step_count} {simulation.step_count === 1 ? 'Step' : 'Steps'}
        </span>
        {currentFolder && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono border flex items-center gap-1"
            style={{
              backgroundColor: `${currentFolder.color}1a`,
              color: currentFolder.color,
              borderColor: `${currentFolder.color}4d`,
            }}
          >
            <Folder className="w-2.5 h-2.5" />
            {currentFolder.name}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Date */}
      <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-slate-500 shrink-0">
        <Calendar className="w-3 h-3" />
        <span>{formattedDate}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFolderMenuOpen((v) => !v);
          }}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Move to Folder"
        >
          <Folder className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(simulation.id);
          }}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Duplicate Simulation"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Export JSON"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(simulation.id);
          }}
          className="p-1.5 rounded-full text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          title="Delete Simulation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {isFolderMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setIsFolderMenuOpen(false)}
            className="absolute right-0 top-full mt-1.5 w-48 bg-surface-950 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-20 max-h-56 overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                onMoveFolder(simulation.id, null);
                setIsFolderMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 text-left"
            >
              <FolderX className="w-3.5 h-3.5 text-slate-500" />
              <span className="flex-1">Uncategorized</span>
              {!currentFolder && <Check className="w-3 h-3 text-indigo-400" />}
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  onMoveFolder(simulation.id, folder.id);
                  setIsFolderMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 text-left"
              >
                <Folder className="w-3.5 h-3.5" style={{ color: folder.color }} />
                <span className="flex-1 truncate">{folder.name}</span>
                {currentFolder?.id === folder.id && <Check className="w-3 h-3 text-indigo-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
