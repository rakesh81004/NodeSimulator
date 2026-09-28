import React, { useState } from 'react';
import { ListNodeVisualNode } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { useIsLightTheme } from '../../../utils/canvasTheme';

interface Props {
  node: ListNodeVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
  onStartLinkDrag?: (e: React.MouseEvent) => void;
}

// Classic linked-list node diagram: a box split into a [value | pointer-knob]
// cell. Dragging from the knob starts a rubber-band line (handled by Canvas,
// which owns the drag/hit-test/drop logic) that wires up `next` when dropped
// on another list node; the fixed connecting arrows themselves are drawn by
// Canvas as a canvas-wide overlay computed from live node positions.
export const ListNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true, onStartLinkDrag }) => {
  const { updateObject } = useSimulationStore();
  const { themeColor } = useTheme();
  const isLight = useIsLightTheme();
  const [isEditing, setIsEditing] = useState(false);

  const { value, label } = node.data;
  const accentColor = (node.style as any)?.borderColor || themeColor;
  const customFill = (node.style as any)?.backgroundColor;

  // Matches ArrayNodeView's theme: an untouched node is a solid accent-colored
  // box in dark mode, or plain black-on-white (worksheet style) in light mode;
  // a custom fill color always keeps white text in either theme.
  const isPlain = isLight && !customFill;
  const fillColor = customFill || (isLight ? '#ffffff' : accentColor);
  const textColor = isPlain ? '#111111' : '#ffffff';

  const formatVal = (v: any) => {
    if (v === undefined || v === null) return '';
    return String(v).replace(/^['"]|['"]$/g, '');
  };
  const parseVal = (raw: string): string | number => {
    const clean = raw.replace(/^['"]|['"]$/g, '');
    const num = Number(clean);
    return !isNaN(num) && clean.trim() !== '' ? num : clean;
  };

  return (
    <div className="relative select-none" style={{ width: `${node.width}px`, height: `${node.height}px` }}>
      {label && (
        <div
          className="absolute -top-5 left-0 text-[10px] font-sans font-bold px-1.5 py-0.5 rounded"
          style={{ color: accentColor }}
        >
          {label}
        </div>
      )}
      <div
        className={`w-full h-full flex rounded-lg overflow-hidden font-sans font-bold text-lg transition-all ${
          isSelected ? 'ring-2 ring-white/90 shadow-2xl' : ''
        }`}
        style={{ border: `2px solid ${accentColor}`, backgroundColor: fillColor }}
      >
        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          style={{ color: textColor }}
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractive) setIsEditing(true);
          }}
        >
          {isEditing && isInteractive ? (
            <input
              type="text"
              autoFocus
              onFocus={(e) => e.target.select()}
              value={formatVal(value)}
              onChange={(e) =>
                updateObject(node.id, { data: { ...node.data, value: parseVal(e.target.value) } } as any)
              }
              onBlur={() => setIsEditing(false)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === 'Escape') setIsEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full bg-transparent outline-none text-center font-sans font-bold"
              style={{ color: textColor }}
            />
          ) : (
            formatVal(value)
          )}
        </div>
        <div
          className={`w-6 flex items-center justify-center group ${isInteractive ? 'cursor-crosshair' : ''}`}
          style={{ borderLeft: `2px solid ${accentColor}` }}
          onMouseDown={(e) => {
            if (!isInteractive || !onStartLinkDrag) return;
            e.stopPropagation();
            onStartLinkDrag(e);
          }}
          title={isInteractive ? 'Drag to another node to set Next' : undefined}
        >
          <div
            className="w-2 h-2 rounded-full transition-transform group-hover:scale-150"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>
    </div>
  );
};
