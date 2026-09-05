import React, { useState } from 'react';
import { StackVisualNode, ArrayElement } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { Plus, LogOut, Palette } from 'lucide-react';

interface Props {
  node: StackVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const StackNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject } = useSimulationStore();
  const { themeColor, separatorColor } = useTheme();
  const [editingElId, setEditingElId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const {
    name = 'Stack',
    elements = [],
    lastAction = 'none',
    lastPoppedValue,
  } = node.data;

  const handlePush = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newEl: ArrayElement = {
      id: `stk_${node.id}_${Date.now()}`,
      value: String.fromCharCode(65 + elements.length),
      highlight: 'pushing',
    };
    const nextElements = [...elements, newEl];
    const newHeight = Math.max(node.height, (nextElements.length * 44) + 60);

    updateObject(node.id, {
      height: newHeight,
      data: {
        ...node.data,
        elements: nextElements,
        lastAction: 'push',
        lastPoppedValue: undefined,
      },
    } as any);
  };

  const handlePop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (elements.length === 0) return;

    const popped = elements[elements.length - 1];
    const nextElements = elements.slice(0, -1);

    updateObject(node.id, {
      data: {
        ...node.data,
        elements: nextElements,
        lastAction: 'pop',
        lastPoppedValue: popped.value,
      },
    } as any);
  };

  const handleElementChange = (elId: string, valStr: string) => {
    const cleanVal = valStr.replace(/^['"]|['"]$/g, '');
    const num = Number(cleanVal);
    const value = !isNaN(num) && cleanVal.trim() !== '' ? num : cleanVal;
    const nextElements = elements.map((el) => (el.id === elId ? { ...el, value } : el));
    updateObject(node.id, {
      data: { ...node.data, elements: nextElements },
    } as any);
  };

  const formatDisplayValue = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).replace(/^['"]|['"]$/g, '');
  };

  const colorPresets = [
    { label: 'Theme', color: themeColor },
    { label: 'Blue', color: '#007aff' },
    { label: 'Green', color: '#00c853' },
    { label: 'Amber', color: '#f59e0b' },
  ];

  const primaryColor = (node.style as any)?.backgroundColor || themeColor;

  // Helper function to darken a color
  const adjustColor = (color: string, amount: number) => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  };

  return (
    <div
      className={`relative flex flex-col select-none transition-all ${
        isSelected ? 'ring-2 ring-white/90 shadow-2xl' : ''
      }`}
      style={{
        width: `${node.width || 170}px`,
        backgroundColor: '#0a0a0a',
        border: `2px solid ${primaryColor}`,
        borderRadius: 4,
      }}
    >
      {/* Header - Only show when selected */}
      {isSelected && (
        <div className="flex items-center justify-between p-2 border-b-2" style={{ borderBottomColor: primaryColor }}>
          <span className="font-sans font-bold text-xs text-purple-300 tracking-wide">
            {name}
          </span>

          {isInteractive && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                title="Change stack color"
              >
                <Palette className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={handlePush}
                className="p-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold"
                title="Push"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
              {elements.length > 0 && (
                <button
                  type="button"
                  onClick={handlePop}
                  className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                  title="Pop"
                >
                  <LogOut className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Color Palette Popover */}
      {showColorPicker && (
        <div className="flex items-center gap-1.5 p-1.5 bg-black border border-slate-700 rounded-lg">
          {colorPresets.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => {
                updateObject(node.id, {
                  style: { ...node.style, backgroundColor: b.color },
                } as any);
                setShowColorPicker(false);
              }}
              className="w-4 h-4 rounded-full border border-white/60 hover:scale-125 transition-transform"
              style={{ backgroundColor: b.color }}
              title={b.label}
            />
          ))}
        </div>
      )}

      {/* Floating Pop Badge */}
      {lastAction === 'pop' && lastPoppedValue !== undefined && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold shadow-lg flex items-center gap-1 animate-bounce whitespace-nowrap z-30 border border-black">
          <span>POPPED:</span>
          <span>{formatDisplayValue(lastPoppedValue)}</span>
        </div>
      )}

      {/* Open-Top Stack Container with Black Horizontal Dividers */}
      <div
        className="flex flex-col-reverse items-center border-x-2 border-b-2 border-t-0 bg-black min-h-[110px] justify-start"
        style={{ borderColor: primaryColor }}
      >
        {elements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-sans py-6">
            (empty)
          </div>
        ) : (
          elements.map((el, idx) => {
            const isTop = idx === elements.length - 1;

            return (
              <div
                key={el.id}
                onDoubleClick={() => isInteractive && setEditingElId(el.id)}
                className="w-full py-2 px-3 font-sans font-bold text-lg text-center text-white mb-0.5 last:mb-0 flex items-center justify-between"
                style={{
                  backgroundColor: isTop ? themeColor : primaryColor,
                  border: '2px solid #000000',
                  borderRadius: '2px',
                }}
              >
                <span className="text-[10px] font-mono font-bold bg-black text-white px-1.5 py-0.5 rounded">{idx}</span>

                {editingElId === el.id ? (
                  <input
                    type="text"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    className="w-14 bg-black/50 text-white font-bold text-center outline-none rounded"
                    value={formatDisplayValue(el.value)}
                    onChange={(e) => handleElementChange(el.id, e.target.value)}
                    onBlur={() => setEditingElId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingElId(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 text-center font-bold">{formatDisplayValue(el.value)}</span>
                )}

                {isTop ? (
                  <span 
                    className="text-[8px] px-1 py-0.2 rounded text-white font-bold uppercase"
                    style={{ backgroundColor: adjustColor(themeColor, -30) }}
                  >
                    TOP
                  </span>
                ) : (
                  <span className="w-4" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stack Name - Below container, centered */}
      <div className="flex items-center justify-center pt-2 pb-1">
        <span className="font-sans font-bold text-xs text-purple-300 tracking-wide">
          {name}
        </span>
      </div>
    </div>
  );
};
