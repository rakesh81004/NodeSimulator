import React, { useState } from 'react';
import { ValueVisualNode } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { Palette, X } from 'lucide-react';

interface Props {
  node: ValueVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const ValueNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject } = useSimulationStore();
  const { themeColor } = useTheme();
  const [editingValue, setEditingValue] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { value, dataType = 'number', strikethrough = false } = node.data;

  const handleValueChange = (valStr: string) => {
    const cleanVal = valStr.replace(/^['"]|['"]$/g, '');
    let finalVal: string | number | boolean = cleanVal;
    if (dataType === 'number') {
      const num = Number(cleanVal);
      if (!isNaN(num) && cleanVal.trim() !== '') finalVal = num;
    } else if (dataType === 'boolean') {
      finalVal = cleanVal.toLowerCase() === 'true';
    }
    updateObject(node.id, {
      data: { ...node.data, value: finalVal },
    } as any);
  };

  const toggleStrikethrough = () => {
    updateObject(node.id, {
      data: { ...node.data, strikethrough: !strikethrough },
    } as any);
  };

  const formatDisplayValue = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).replace(/^['"]|['"]$/g, '');
  };

  const colorPresets = [
    { label: 'Theme', color: themeColor },
    { label: 'Green', color: '#00c853' },
    { label: 'Purple', color: '#8b5cf6' },
    { label: 'Amber', color: '#ffb300' },
    { label: 'Red', color: '#f43f5e' },
  ];

  const accentColor = (node.style as any)?.backgroundColor || themeColor;

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 select-none transition-all ${
        isSelected ? 'ring-2 ring-white/90 shadow-2xl' : ''
      }`}
      style={{
        backgroundColor: accentColor,
        border: '2px solid #000000',
        borderRadius: 12,
        color: '#f8fafc',
        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.4)',
      }}
    >
      {editingValue && isInteractive ? (
        <input
          type="text"
          autoFocus
          onFocus={(e) => e.target.select()}
          className="w-20 bg-black/30 text-white font-bold px-1 py-0.5 rounded outline-none border border-black text-center text-base"
          value={formatDisplayValue(value)}
          onChange={(e) => handleValueChange(e.target.value)}
          onBlur={() => setEditingValue(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setEditingValue(false);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="font-bold cursor-pointer text-base"
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractive) setEditingValue(true);
          }}
          title="Click to edit value"
        >
          {formatDisplayValue(value)}
        </span>
      )}

      {/* Red Diagonal Strikethrough Overlay */}
      {strikethrough && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 overflow-hidden">
          <div
            style={{
              width: '140%',
              height: '2px',
              backgroundColor: '#ff3b30',
              transform: 'rotate(-45deg)',
            }}
          />
        </div>
      )}

      {isSelected && isInteractive && (
        <div className="flex items-center gap-1 ml-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleStrikethrough();
            }}
            className={`p-1 rounded transition-colors ${
              strikethrough ? 'bg-white text-black' : 'bg-black text-white hover:scale-110'
            }`}
            title={strikethrough ? 'Remove cross mark' : 'Add cross mark'}
          >
            <X className="w-2.5 h-2.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className="p-1 rounded bg-black text-white hover:scale-110 transition-transform"
            title="Change value color"
          >
            <Palette className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {showColorPicker && (
        <div
          className="absolute top-full mt-2 z-50 bg-black border border-slate-700 rounded-xl p-1.5 shadow-2xl flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
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
    </div>
  );
};
