import React, { useState } from 'react';
import { PointerVisualNode } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  node: PointerVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const PointerNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject } = useSimulationStore();
  const { themeColor } = useTheme();
  const [editingLabel, setEditingLabel] = useState(false);

  const { label = 'left', direction = 'up', color = '#00e676' } = node.data;
  const pointerColor = color || themeColor;

  const handleLabelChange = (newLabel: string) => {
    updateObject(node.id, {
      data: { ...node.data, label: newLabel.trim() || label },
    } as any);
  };

  const isUp = direction === 'up';

  const renderArrowIcon = () => {
    const iconStyle = { color: pointerColor };
    switch (direction) {
      case 'up':
        return <ArrowUp className="w-6 h-6 stroke-[3]" style={iconStyle} />;
      case 'down':
        return <ArrowDown className="w-6 h-6 stroke-[3]" style={iconStyle} />;
      case 'left':
        return <ArrowLeft className="w-6 h-6 stroke-[3]" style={iconStyle} />;
      case 'right':
        return <ArrowRight className="w-6 h-6 stroke-[3]" style={iconStyle} />;
      default:
        return <ArrowUp className="w-6 h-6 stroke-[3]" style={iconStyle} />;
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none transition-all cursor-pointer ${
        isSelected ? 'scale-110' : ''
      }`}
      style={{
        filter: isSelected ? `drop-shadow(0 0 10px ${pointerColor})` : 'none',
        width: `${node.width || 44}px`,
        height: `${node.height || 54}px`,
      }}
    >
      {/* If pointing UP: Arrow on top, label below */}
      {isUp && renderArrowIcon()}

      {/* Clean Bold Label (Green font, no boxes, just like reference) */}
      <div className="flex items-center justify-center my-0.5">
        {editingLabel && isInteractive ? (
          <input
            type="text"
            autoFocus
            onFocus={(e) => e.target.select()}
            className="w-16 bg-black/60 text-center outline-none font-bold font-sans text-base border-b"
            style={{ color: pointerColor, borderBottomColor: pointerColor }}
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
            onClick={(e) => {
              e.stopPropagation();
              if (isInteractive) setEditingLabel(true);
            }}
            className="font-sans font-bold text-lg md:text-xl tracking-wide cursor-pointer transition-transform hover:scale-105"
            style={{
              color: pointerColor, // Use theme color for pointer text
              textShadow: `0 0 10px ${pointerColor}80`,
            }}
            title="Click to rename pointer"
          >
            {label}
          </span>
        )}
      </div>

      {/* If pointing DOWN: Label on top, arrow below */}
      {!isUp && renderArrowIcon()}
    </div>
  );
};
