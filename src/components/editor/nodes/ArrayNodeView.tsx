import React, { useState } from 'react';
import { ArrayVisualNode, ArrayElement } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { Plus, Trash2, Palette, GripVertical } from 'lucide-react';

interface Props {
  node: ArrayVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
  diffDetails?: any;
  transitionProgress?: number;
}

export const ArrayNodeView: React.FC<Props> = ({
  node,
  isSelected,
  isInteractive = true,
  diffDetails,
  transitionProgress = 1.0,
}) => {
  const { updateObject } = useSimulationStore();
  const { themeColor, separatorColor } = useTheme();
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [paletteCellId, setPaletteCellId] = useState<string | null>(null);
  const [draggedCellId, setDraggedCellId] = useState<string | null>(null);
  const [dragOverCellId, setDragOverCellId] = useState<string | null>(null);

  const { showIndexes = false, cellSize = 56, elements = [], orientation = 'horizontal' } = node.data;
  const isHorizontal = orientation !== 'vertical';

  const handleCellChange = (cellId: string, newVal: string) => {
    const cleanVal = newVal.replace(/^['"]|['"]$/g, '');
    const numVal = Number(cleanVal);
    const value = !isNaN(numVal) && cleanVal.trim() !== '' ? numVal : cleanVal;
    const nextElements = elements.map((el) =>
      el.id === cellId ? { ...el, value } : el
    );
    updateObject(node.id, {
      data: { ...node.data, elements: nextElements },
    } as any);
  };

  const handleSetCellColor = (cellId: string, color: string, highlightKey: string = 'none') => {
    const nextElements = elements.map((el) =>
      el.id === cellId ? { ...el, highlight: highlightKey as any, color } : el
    );
    updateObject(node.id, {
      data: { ...node.data, elements: nextElements },
    } as any);
    setPaletteCellId(null);
  };

  const handleAddCell = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const lastNum = typeof elements[elements.length - 1]?.value === 'number' ? Number(elements[elements.length - 1].value) : elements.length * 2;
    const newCell: ArrayElement = {
      id: `c_${node.id}_${Date.now()}`,
      value: lastNum + 2,
      highlight: 'none',
    };
    const nextElements = [...elements, newCell];
    const newWidth = isHorizontal ? nextElements.length * cellSize : node.width;

    updateObject(node.id, {
      width: newWidth,
      data: { ...node.data, elements: nextElements },
    } as any);
  };

  const handleRemoveCell = (e: React.MouseEvent, cellId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (elements.length <= 1) return;
    const nextElements = elements.filter((el) => el.id !== cellId);
    updateObject(node.id, {
      width: nextElements.length * cellSize,
      data: { ...node.data, elements: nextElements },
    } as any);
  };

  const handleDragStart = (e: React.DragEvent, cellId: string) => {
    if (!isInteractive) return;
    e.stopPropagation();
    setDraggedCellId(cellId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cellId);
  };

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    if (!isInteractive || draggedCellId === cellId) return;
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCellId(cellId);
  };

  const handleDragLeave = () => {
    setDragOverCellId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCellId: string) => {
    if (!isInteractive || !draggedCellId) return;
    e.stopPropagation();
    e.preventDefault();
    
    const sourceIndex = elements.findIndex(el => el.id === draggedCellId);
    const targetIndex = elements.findIndex(el => el.id === targetCellId);
    
    if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
      // True swap between source and target
      const nextElements = [...elements];
      const temp = nextElements[sourceIndex];
      nextElements[sourceIndex] = nextElements[targetIndex];
      nextElements[targetIndex] = temp;

      updateObject(node.id, {
        data: { ...node.data, elements: nextElements },
      } as any);
    }
    
    setDraggedCellId(null);
    setDragOverCellId(null);
  };

  const handleDragEnd = () => {
    setDraggedCellId(null);
    setDragOverCellId(null);
  };

  const getCellBgColor = (cell: ArrayElement) => {
    if ((cell as any).color) return (cell as any).color;
    switch (cell.highlight) {
      case 'active':
      case 'found':
      case 'window':
        return themeColor;
      case 'swapping':
        return '#ffb300';
      case 'visited':
        return '#64748b';
      case 'dimmed':
        return '#1e293b';
      default:
        return themeColor;
    }
  };

  const formatDisplayValue = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).replace(/^['"]|['"]$/g, '');
  };

  const colorPresets = [
    { label: 'Blue', color: '#007aff', highlight: 'none' },
    { label: 'Green', color: '#00c853', highlight: 'found' },
    { label: 'Yellow', color: '#ffd600', highlight: 'swapping' },
    { label: 'Purple', color: '#8b5cf6', highlight: 'window' },
    { label: 'Red', color: '#f43f5e', highlight: 'mismatch' },
    { label: 'Orange', color: '#ff9800', highlight: 'swapping' },
  ];

  // Transition calculations
  const t = transitionProgress;
  const isTransitionActive = Boolean(diffDetails?.arrayChanged && t >= 0 && t < 1);
  const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const swappedIndices = diffDetails?.arrayChanged?.swappedIndices as [number, number] | undefined;
  const elementMoves = diffDetails?.arrayChanged?.elementMoves as { fromIndex: number; toIndex: number; value: any; id: string }[] | undefined;
  const valueChanges = diffDetails?.arrayChanged?.valueChanges as { index: number; oldValue: any; newValue: any }[] | undefined;

  return (
    <div
      className={`relative inline-flex flex-col select-none transition-shadow ${
        isSelected ? 'ring-2 ring-white/90 shadow-2xl' : ''
      }`}
      style={{
        border: `2px solid ${separatorColor}`,
        borderRadius: 2,
        backgroundColor: separatorColor,
      }}
    >
      {/* Seamless Joined Solid Block Strip with Solid Black Separator Lines */}
      <div 
        className={`inline-flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center overflow-visible`}
        title="Drag this area to move the entire array"
      >
        {elements.map((cell, idx) => {
          // Check if this cell is undergoing a swap animation
          let transformStyle = '';
          let zIndex = 1;
          let isSwappingCell = false;

          if (isTransitionActive && swappedIndices) {
            const [idxA, idxB] = swappedIndices;
            if (idx === idxA) {
              isSwappingCell = true;
              zIndex = 40;
              const deltaX = (idxB - idxA) * (cellSize + 2);
              const arcY = -Math.sin(Math.PI * t) * 36; // Arc upward
              const scale = 1 + Math.sin(Math.PI * t) * 0.18;
              transformStyle = `translate(${easeT * deltaX}px, ${arcY}px) scale(${scale})`;
            } else if (idx === idxB) {
              isSwappingCell = true;
              zIndex = 40;
              const deltaX = (idxA - idxB) * (cellSize + 2);
              const arcY = Math.sin(Math.PI * t) * 36; // Arc downward
              const scale = 1 + Math.sin(Math.PI * t) * 0.18;
              transformStyle = `translate(${easeT * deltaX}px, ${arcY}px) scale(${scale})`;
            }
          } else if (isTransitionActive && elementMoves) {
            const move = elementMoves.find((m) => m.fromIndex === idx);
            if (move) {
              isSwappingCell = true;
              zIndex = 40;
              const deltaX = (move.toIndex - move.fromIndex) * (cellSize + 2);
              const arcY = (idx % 2 === 0 ? -1 : 1) * Math.sin(Math.PI * t) * 32;
              const scale = 1 + Math.sin(Math.PI * t) * 0.15;
              transformStyle = `translate(${easeT * deltaX}px, ${arcY}px) scale(${scale})`;
            }
          }

          // Check for value replacement crossfade
          const valChange = valueChanges?.find((v) => v.index === idx);
          const bgColor = getCellBgColor(cell);

          return (
            <div
              key={cell.id}
              className="relative flex flex-col items-center group"
              style={{ zIndex }}
            >
              {/* Optional Minimal Index */}
              {showIndexes && (
                <span 
                  className="text-[11px] font-mono font-bold text-slate-400 mb-1 cursor-grab active:cursor-grabbing"
                  title="Drag here to move the entire array"
                >
                  {idx}
                </span>
              )}

              {/* Solid Cell Box with Black Vertical Divider */}
              <div
                className={`relative flex items-center justify-center font-sans font-bold text-white transition-colors cursor-pointer mr-0.5 last:mr-0 ${
                  isInteractive ? 'cursor-move' : 'cursor-pointer'
                } ${draggedCellId === cell.id ? 'opacity-50 scale-95' : ''} ${
                  dragOverCellId === cell.id ? 'ring-2 ring-white scale-105' : ''
                }`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: bgColor,
                  fontSize: '24px',
                  border: '2px solid #000000',
                  borderRadius: '2px',
                  transform: transformStyle || undefined,
                  boxShadow: isSwappingCell ? '0 10px 20px rgba(0,0,0,0.45)' : undefined,
                }}
                draggable={isInteractive}
                onDragStart={(e) => handleDragStart(e, cell.id)}
                onDragOver={(e) => handleDragOver(e, cell.id)}
                onDragLeave={() => handleDragLeave()}
                onDrop={(e) => handleDrop(e, cell.id)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInteractive) setEditingCellId(cell.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isInteractive) setPaletteCellId(paletteCellId === cell.id ? null : cell.id);
                }}
                title={isInteractive ? "Drag element to swap, Click to edit value, Right click to change color, Drag container/indices to move array" : "Click to edit value, Right click to change color"}
              >
                {editingCellId === cell.id && isInteractive ? (
                  <input
                    type="text"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    className="w-full h-full text-center bg-black/50 outline-none font-bold text-white text-2xl"
                    value={formatDisplayValue(cell.value)}
                    onChange={(e) => handleCellChange(cell.id, e.target.value)}
                    onBlur={() => setEditingCellId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setEditingCellId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : valChange && isTransitionActive && !isSwappingCell ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Old value fading out */}
                    <span
                      className="absolute font-sans font-bold text-white text-2xl transition-opacity"
                      style={{
                        opacity: Math.max(0, 1 - t * 2),
                        transform: `scale(${1 - t * 0.2})`,
                      }}
                    >
                      {formatDisplayValue(valChange.oldValue)}
                    </span>
                    {/* New value fading in */}
                    <span
                      className="absolute font-sans font-bold text-white text-2xl transition-opacity"
                      style={{
                        opacity: Math.max(0, (t - 0.4) * 1.67),
                        transform: `scale(${0.8 + t * 0.2})`,
                        color: '#ffeb3b',
                      }}
                    >
                      {formatDisplayValue(valChange.newValue)}
                    </span>
                  </div>
                ) : (
                  <span>{formatDisplayValue(cell.value)}</span>
                )}

                {/* Drag handle indicator */}
                {isInteractive && isSelected && (
                  <div className="absolute top-1 left-1 opacity-30 hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Quick Color Palette Hover Trigger */}
                {isSelected && isInteractive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setPaletteCellId(paletteCellId === cell.id ? null : cell.id);
                    }}
                    className="absolute -bottom-2 right-0 p-0.5 rounded bg-black text-white opacity-0 group-hover:opacity-100 hover:scale-110 transition-all border border-slate-700 z-20"
                    title="Change color"
                  >
                    <Palette className="w-2.5 h-2.5" />
                  </button>
                )}

                {/* Quick Remove Element on Hover */}
                {isSelected && elements.length > 1 && isInteractive && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCell(e, cell.id)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity shadow hover:bg-rose-700 z-20"
                    title="Delete cell"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Color Palette Popover */}
              {paletteCellId === cell.id && (
                <div
                  className="absolute top-full mt-2 z-50 bg-black border border-slate-700 rounded-xl p-1.5 shadow-2xl flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {colorPresets.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => handleSetCellColor(cell.id, b.color, b.highlight)}
                      className="w-5 h-5 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: b.color }}
                      title={b.label}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Plus Button to Append Cell */}
        {isSelected && isInteractive && (
          <button
            type="button"
            onClick={handleAddCell}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center justify-center rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors ml-1"
            style={{
              width: `${Math.max(26, cellSize * 0.5)}px`,
              height: `${cellSize}px`,
            }}
            title="Add cell"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
