import React, { useState } from 'react';
import { SimulationSummary } from '../../types/simulation';
import { useTheme } from '../../utils/themeConfig';
import {
  Play,
  Copy,
  Download,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  simulation: SimulationSummary;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SimulationCard: React.FC<Props> = ({
  simulation,
  onOpen,
  onDuplicate,
  onDelete,
}) => {
  const { themeColor } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const formattedDate = new Date(simulation.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/api/simulations/${simulation.id}/export`;
  };

  return (
    <div
      onClick={() => onOpen(simulation.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-surface-900/90 hover:bg-surface-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative"
      style={{
        borderColor: isHovered ? `${themeColor}80` : '#1e293b',
        boxShadow: isHovered ? `0 20px 25px -5px ${themeColor}20` : 'none',
      }}
    >
      <div>
        {/* Card Header: Tags & Version */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span 
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border"
              style={{
                backgroundColor: `${themeColor}1a`,
                color: themeColor,
                borderColor: `${themeColor}4d`,
              }}
            >
              {simulation.step_count} {simulation.step_count === 1 ? 'Step' : 'Steps'}
            </span>
            {simulation.tags &&
              simulation.tags.split(',').map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/50"
                >
                  {tag.trim()}
                </span>
              ))}
          </div>

          <span className="text-[10px] font-mono text-slate-500">
            v{simulation.schema_version}
          </span>
        </div>

        {/* Title & Description */}
        <h3 
          className="text-base font-bold text-slate-100 transition-colors mb-1 truncate"
          style={{ color: isHovered ? themeColor : '#f8fafc' }}
        >
          {simulation.name}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {simulation.description || 'Visual DSA dry run animation.'}
        </p>
      </div>

      {/* Card Footer: Metadata & Actions */}
      <div className="pt-3 border-t-2 border-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(simulation.id);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Duplicate Simulation"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
            className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            title="Delete Simulation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
