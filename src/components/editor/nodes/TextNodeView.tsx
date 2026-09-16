import React, { useState } from 'react';
import { TextVisualNode } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { Quote } from 'lucide-react';
import { useIsLightTheme } from '../../../utils/canvasTheme';

interface Props {
  node: TextVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const TextNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject } = useSimulationStore();
  const [isEditing, setIsEditing] = useState(false);
  const isLight = useIsLightTheme();

  const { text = '', fontSize = 14, fontWeight = 'normal', isCallout = false, badgeText } = node.data;

  const handleTextChange = (newText: string) => {
    updateObject(node.id, {
      data: { ...node.data, text: newText },
    } as any);
  };

  return (
    <div
      className={`relative px-4 py-2.5 rounded-2xl flex items-center gap-3 select-none backdrop-blur shadow-lg transition-all border-l-4 ${
        isSelected ? 'ring-2 ring-indigo-400' : ''
      }`}
      style={
        isLight
          ? {
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb',
              borderLeftColor: '#f97316',
              borderWidth: 1,
              borderLeftWidth: 4,
              color: '#111111',
              minWidth: `${node.width || 200}px`,
              maxWidth: '600px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }
          : {
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#6366f1',
              borderLeftColor: '#38bdf8',
              borderWidth: 1,
              borderLeftWidth: 4,
              color: node.style.color || '#e2e8f0',
              minWidth: `${node.width || 200}px`,
              maxWidth: '600px',
            }
      }
    >
      <Quote className={`w-4 h-4 flex-shrink-0 opacity-70 ${isLight ? 'text-orange-500' : 'text-sky-400'}`} />

      {badgeText && (
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider flex-shrink-0 border ${
            isLight ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
          }`}
        >
          {badgeText}
        </span>
      )}

      {isEditing && isInteractive ? (
        <input
          type="text"
          autoFocus
          className={`w-full bg-transparent outline-none border-b text-xs ${isLight ? 'text-black border-orange-400' : 'text-white border-indigo-400'}`}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setIsEditing(false);
          }}
        />
      ) : (
        <p
          onDoubleClick={() => isInteractive && setIsEditing(true)}
          className={`cursor-pointer text-xs md:text-sm font-medium leading-relaxed italic ${isLight ? 'text-black' : 'text-slate-200'}`}
          title="Double click to edit note"
        >
          {text || 'Click to add step explanation...'}
        </p>
      )}
    </div>
  );
};
