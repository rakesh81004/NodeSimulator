import React, { useState } from 'react';
import { StringVisualNode, ArrayElement } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { Plus, Trash2, Palette, GripVertical } from 'lucide-react';

interface Props {
  node: StringVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
  diffDetails?: any;
  transitionProgress?: number;
}

export const StringNodeView: React.FC<Props> = ({
  node,
  isSelected,
  isInteractive = true,
  diffDetails,
  transitionProgress = 1.0,
}) => {
  const { updateObject } = useSimulationStore();
  const { themeColor, separatorColor } = useTheme();
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [paletteCharId, setPaletteCharId] = useState<string | null>(null);
  const [draggedCharId, setDraggedCharId] = useState<string | null>(null);
  const [dragOverCharId, setDragOverCharId] = useState<string | null>(null);

  const { showIndexes = false, cellSize = 56, characters = [] } = node.data;

  // Transition calculations
  const t = transitionProgress;
  const isTransitionActive = Boolean(diffDetails?.arrayChanged && t >= 0 && t < 1);
  const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const swappedIndices = diffDetails?.arrayChanged?.swappedIndices as [number, number] | undefined;
  const elementMoves = diffDetails?.arrayChanged?.elementMoves as { fromIndex: number; toIndex: number; value: any; id: string }[] | undefined;
  const valueChanges = diffDetails?.arrayChanged?.valueChanges as { index: number; oldValue: any; newValue: any }[] | undefined;

  const handleCharChange = (charId: string, newVal: string) => {
    const cleanVal = newVal.replace(/^['"]|['"]$/g, '');
    const value = cleanVal.length > 0 ? cleanVal.slice(-1) : '';
    const nextChars = characters.map((ch) =>
      ch.id === charId ? { ...ch, value } : ch
    );
    updateObject(node.id, {
      data: { ...node.data, characters: nextChars },
    } as any);
  };

  const handleSetCharColor = (charId: string, color: string, highlightKey: string = 'none') => {
    const nextChars = characters.map((ch) =>
      ch.id === charId ? { ...ch, highlight: highlightKey as any, color } : ch
    );
    updateObject(node.id, {
      data: { ...node.data, characters: nextChars },
    } as any);
    setPaletteCharId(null);
  };

  const handleAddChar = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newChar: ArrayElement = {
      id: `ch_${node.id}_${Date.now()}`,
      value: 'a',
      highlight: 'none',
    };
    const nextChars = [...characters, newChar];
    updateObject(node.id, {
      width: nextChars.length * cellSize,
      data: { ...node.data, characters: nextChars },
    } as any);
  };

  const handleRemoveChar = (e: React.MouseEvent, charId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (characters.length <= 1) return;
    const nextChars = characters.filter((ch) => ch.id !== charId);
    updateObject(node.id, {
      width: nextChars.length * cellSize,
      data: { ...node.data, characters: nextChars },
    } as any);
  };

  const handleDragStart = (e: React.DragEvent, charId: string) => {
    if (!isInteractive) return;
    e.stopPropagation();
    setDraggedCharId(charId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', charId);
  };

  const handleDragOver = (e: React.DragEvent, charId: string) => {
    if (!isInteractive || draggedCharId === charId) return;
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCharId(charId);
  };

  const handleDragLeave = () => {
    setDragOverCharId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCharId: string) => {
    if (!isInteractive || !draggedCharId) return;
    e.stopPropagation();
    e.preventDefault();
    
    const sourceIndex = characters.findIndex(ch => ch.id === draggedCharId);
    const targetIndex = characters.findIndex(ch => ch.id === targetCharId);
    
    if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
      // True swap between source and target
      const nextChars = [...characters];
      const temp = nextChars[sourceIndex];
      nextChars[sourceIndex] = nextChars[targetIndex];
      nextChars[targetIndex] = temp;
      
      // Update highlight to show swapping
      const highlightedChars = nextChars.map((ch, idx) => {
        if (idx === targetIndex || idx === sourceIndex) {
          return { ...ch, highlight: 'swapping' as any };
        }
        return ch;
      });
      
      updateObject(node.id, {
        data: { ...node.data, characters: highlightedChars },
      } as any);
      
      // Remove swapping highlight after short delay
      setTimeout(() => {
        const finalChars = highlightedChars.map(ch => ({ ...ch, highlight: 'none' as any }));
        updateObject(node.id, {
          data: { ...node.data, characters: finalChars },
        } as any);
      }, 500);
    }
    
    setDraggedCharId(null);
    setDragOverCharId(null);
  };

  const handleDragEnd = () => {
    setDraggedCharId(null);
    setDragOverCharId(null);
  };

  const getCellBgColor = (charEl: ArrayElement) => {
    if ((charEl as any).color) return (charEl as any).color;
    switch (charEl.highlight) {
      case 'active':
      case 'found':
      case 'window':
        return themeColor; // Use theme color for highlighted cells
      case 'swapping':
        return '#ffb300'; // Vibrant Solid Amber for swapping
      case 'visited':
        return '#64748b'; // Slate for visited
      case 'dimmed':
        return '#1e293b'; // Dimmed
      default:
        return themeColor; // Use theme color as default
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
      // Allow Canvas drag when clicking on non-element areas
    >
      {/* Seamless Joined Solid Block Strip with Solid Black Separator Lines */}
      <div 
        className="inline-flex flex-row items-center overflow-visible"
        // Allow dragging the container to move the string
        title="Drag this area to move the entire string"
      >
        {characters.map((ch, idx) => {
          let transformStyle = '';
          let zIndex = 1;
          let isSwappingChar = false;
          let customGlow = '';

          if (isTransitionActive && swappedIndices) {
            const [idxA, idxB] = swappedIndices;
            if (idx === idxA) {
              isSwappingChar = true;
              zIndex = 40;
              const deltaX = (idxB - idxA) * (cellSize + 2);
              const arcY = -Math.sin(Math.PI * t) * 36;
              const scale = 1 + Math.sin(Math.PI * t) * 0.18;
              transformStyle = `translate(${easeT * deltaX}px, ${arcY}px) scale(${scale})`;
              customGlow = '0 0 24px #ffb300, 0 8px 16px rgba(0,0,0,0.5)';
            } else if (idx === idxB) {
              isSwappingChar = true;
              zIndex = 40;
              const deltaX = (idxA - idxB) * (cellSize + 2);
              const arcY = Math.sin(Math.PI * t) * 36;
              const scale = 1 + Math.sin(Math.PI * t) * 0.18;
              transformStyle = `translate(${easeT * deltaX}px, ${arcY}px) scale(${scale})`;
              customGlow = '0 0 24px #ffb300, 0 8px 16px rgba(0,0,0,0.5)';
            }
          } else if (isTransitionActive && elementMoves) {
            const move = elementMoves.find((m) => m.fromIndex === idx);
            if (move) {
              isSwappingChar = true;
              zIndex = 40;
              const deltaX = (move.toIndex - move.fromIndex) * (cellSize + 2);
              const arcY = (idx % 2 === 0 ? -1 : 1) * Math.sin(Math.PI * t) * 32;
              const scale = 1 + Math.sin(Math.PI * t) * 0.15;
              transformStyle = `translate(${easeT * deltaX}px, ${arcY}px) scale(${scale})`;
              customGlow = '0 0 20px #ffb300';
            }
          }

          const valChange = valueChanges?.find((v) => v.index === idx);
          const bgColor = isSwappingChar ? '#ffb300' : getCellBgColor(ch);

          return (
            <div key={ch.id} className="relative flex flex-col items-center group" style={{ zIndex }}>
              {/* Optional Minimal Index */}
              {showIndexes && (
                <span 
                  className="text-[11px] font-mono font-bold text-slate-400 mb-1 cursor-grab active:cursor-grabbing"
                  title="Drag here to move the entire string"
                >
                  {idx}
                </span>
              )}

              {/* Solid Character Cell Box with Black Vertical Divider */}
              <div
                className={`relative flex items-center justify-center font-sans font-bold text-white transition-colors cursor-pointer mr-0.5 last:mr-0 ${
                  isInteractive ? 'cursor-move' : 'cursor-pointer'
                } ${draggedCharId === ch.id ? 'opacity-50 scale-95' : ''} ${
                  dragOverCharId === ch.id ? 'ring-2 ring-white scale-105' : ''
                }`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: bgColor,
                  fontSize: '24px',
                  border: isSwappingChar ? '2px solid #ffffff' : '2px solid #000000',
                  borderRadius: '2px',
                  transform: transformStyle || undefined,
                  boxShadow: customGlow || undefined,
                  transition: !isTransitionActive ? 'transform 0.2s ease, box-shadow 0.2s ease' : undefined,
                }}
                draggable={isInteractive}
                onDragStart={(e) => handleDragStart(e, ch.id)}
                onDragOver={(e) => handleDragOver(e, ch.id)}
                onDragLeave={() => handleDragLeave()}
                onDrop={(e) => handleDrop(e, ch.id)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInteractive) setEditingCharId(ch.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isInteractive) setPaletteCharId(paletteCharId === ch.id ? null : ch.id);
                }}
                title={isInteractive ? "Drag character to swap, Click to edit character, Right click to change color, Drag container/indices to move string" : "Click to edit character, Right click to change color"}
              >
                {editingCharId === ch.id && isInteractive ? (
                  <input
                    type="text"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    maxLength={1}
                    className="w-full h-full text-center bg-black/50 outline-none font-bold text-white text-2xl"
                    value={formatDisplayValue(ch.value)}
                    onChange={(e) => handleCharChange(ch.id, e.target.value)}
                    onBlur={() => setEditingCharId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setEditingCharId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : valChange && isTransitionActive ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <span
                      className="absolute font-sans font-bold text-white text-2xl transition-opacity"
                      style={{
                        opacity: Math.max(0, 1 - t * 2),
                        transform: `scale(${1 - t * 0.2})`,
                      }}
                    >
                      {formatDisplayValue(valChange.oldValue)}
                    </span>
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
                  <span>{formatDisplayValue(ch.value)}</span>
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
                      setPaletteCharId(paletteCharId === ch.id ? null : ch.id);
                    }}
                    className="absolute -bottom-2 right-0 p-0.5 rounded bg-black text-white opacity-0 group-hover:opacity-100 hover:scale-110 transition-all border border-slate-700 z-20"
                    title="Change color"
                  >
                    <Palette className="w-2.5 h-2.5" />
                  </button>
                )}

                {/* Quick Remove on Hover */}
                {isSelected && characters.length > 1 && isInteractive && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveChar(e, ch.id)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent Canvas drag
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity shadow hover:bg-rose-700 z-20"
                    title="Delete character"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Color Palette Popover */}
              {paletteCharId === ch.id && (
                <div
                  className="absolute top-full mt-2 z-50 bg-black border border-slate-700 rounded-xl p-1.5 shadow-2xl flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()} // Prevent Canvas drag
                >
                  {colorPresets.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => handleSetCharColor(ch.id, b.color, b.highlight)}
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

        {isSelected && isInteractive && (
          <button
            type="button"
            onClick={handleAddChar}
            onMouseDown={(e) => e.preventDefault()} // Prevent Canvas drag
            className="flex items-center justify-center rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors ml-1"
            style={{
              width: `${Math.max(26, cellSize * 0.5)}px`,
              height: `${cellSize}px`,
            }}
            title="Add character"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
