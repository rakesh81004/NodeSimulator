import React, { useState } from 'react';
import { HighlightVisualNode } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';

interface Props {
  node: HighlightVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const HighlightNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject } = useSimulationStore();
  const [editingLabel, setEditingLabel] = useState(false);

  const { label = '', color = '#38bdf8', variant = 'window' } = node.data;

  const handleLabelChange = (newLabel: string) => {
    updateObject(node.id, {
      data: { ...node.data, label: newLabel },
    } as any);
  };

  const isDashed = variant === 'dashed' || variant === 'window';

  return (
    <div
      className={`relative select-none flex flex-col justify-between p-2 rounded-xl transition-all ${
        isSelected ? 'ring-2 ring-indigo-500 shadow-glow-indigo' : ''
      }`}
      style={{
        width: `${node.width || 200}px`,
        height: `${node.height || 100}px`,
        backgroundColor: node.style.backgroundColor || `${color}15`,
        borderColor: node.style.borderColor || color,
        borderWidth: node.style.borderWidth || 2,
        borderStyle: isDashed ? 'dashed' : 'solid',
        borderRadius: node.style.borderRadius || 12,
        boxShadow: node.style.glow ? `0 0 20px ${color}30` : undefined,
      }}
    >
      {label && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700/60 w-fit">
          {editingLabel && isInteractive ? (
            <input
              type="text"
              autoFocus
              className="bg-transparent text-xs font-mono font-bold text-white outline-none"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(false);
              }}
            />
          ) : (
            <span
              onDoubleClick={() => isInteractive && setEditingLabel(true)}
              className="text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
              style={{ color }}
              title="Double click to edit label"
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
