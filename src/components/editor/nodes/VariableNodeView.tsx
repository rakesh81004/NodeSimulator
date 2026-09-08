import React, { useState } from 'react';
import { VariableVisualNode } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { Palette } from 'lucide-react';

interface Props {
  node: VariableVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
  diffOldValue?: any;
  diffNewValue?: any;
  transitionProgress?: number;
}

export const VariableNodeView: React.FC<Props> = ({
  node,
  isSelected,
  isInteractive = true,
  diffOldValue,
  diffNewValue,
  transitionProgress = 1.0,
}) => {
  const { simulation, currentStepIndex, updateObject } = useSimulationStore();
  const { themeColor } = useTheme();
  const [editingValue, setEditingValue] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { name, value, dataType = 'number' } = node.data;

  // Retrieve previous step's value to show historical strikethrough!
  const prevStep = simulation && currentStepIndex > 0 ? simulation.steps[currentStepIndex - 1] : null;
  const prevVar = prevStep?.objects.find(
    (o) => o.id === node.id || (o.type === 'variable' && (o as any).data?.name === name)
  );
  const prevStepValue = prevVar ? (prevVar as any).data?.value : undefined;
  const hasStepHistory = prevStepValue !== undefined && String(prevStepValue) !== String(value);

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

  const handleNameChange = (newName: string) => {
    updateObject(node.id, {
      data: { ...node.data, name: newName.trim() || name },
    } as any);
  };

  const formatDisplayValue = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).replace(/^['"]|['"]$/g, '');
  };

  const hasTransitionDiff = diffOldValue !== undefined && diffNewValue !== undefined && diffOldValue !== diffNewValue;
  const isResult = name.toLowerCase().includes('result') || name.toLowerCase().includes('isvalid') || name.toLowerCase().includes('ans');

  const colorPresets = [
    { label: 'Theme', color: themeColor },
    { label: 'Green', color: '#00c853' },
    { label: 'Purple', color: '#8b5cf6' },
    { label: 'Amber', color: '#ffb300' },
  ];

  const accentColor = (node.style as any)?.backgroundColor || (isResult ? '#00c853' : themeColor);

  // Eased slide progress for the old->new value transition
  const slideT = transitionProgress;
  const easeSlide = slideT < 0.5 ? 2 * slideT * slideT : -1 + (4 - 2 * slideT) * slideT;
  const oldValueStr = formatDisplayValue(diffOldValue);
  const newValueStr = formatDisplayValue(diffNewValue);
  const widerValueStr = oldValueStr.length >= newValueStr.length ? oldValueStr : newValueStr;

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
      {/* Variable Name (Click to edit) */}
      {editingName && isInteractive ? (
        <input
          type="text"
          autoFocus
          onFocus={(e) => e.target.select()}
          className="w-16 bg-slate-950 text-white font-bold px-1 rounded outline-none border border-slate-700 text-base"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={() => setEditingName(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false);
          }}
        />
      ) : (
        <span
          className="text-base font-sans font-bold cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractive) setEditingName(true);
          }}
          title="Click to rename"
        >
          {name}
        </span>
      )}

      <span className="mx-0.5 font-bold text-base text-white">=</span>

      {/* Variable Value (With Strikethrough & No Quotes) */}
      {hasTransitionDiff ? (
        <div className="relative inline-block overflow-hidden align-middle" style={{ height: '1.4em' }}>
          {/* Invisible sizer reserves width for the wider of the two values */}
          <span className="invisible font-bold text-base whitespace-nowrap">{widerValueStr}</span>

          {/* Old value slides up and out, like the outgoing frame in an Instagram story */}
          <span
            className="absolute inset-0 flex items-center font-bold text-base text-white whitespace-nowrap"
            style={{
              transform: `translateY(${-easeSlide * 100}%)`,
              opacity: 1 - easeSlide,
            }}
          >
            {oldValueStr}
          </span>

          {/* New value slides up into place from below */}
          <span
            className="absolute inset-0 flex items-center font-bold text-base text-white whitespace-nowrap"
            style={{
              transform: `translateY(${(1 - easeSlide) * 100}%)`,
              opacity: easeSlide,
            }}
          >
            {newValueStr}
          </span>
        </div>
      ) : editingValue && isInteractive ? (
        <input
          type="text"
          autoFocus
          onFocus={(e) => e.target.select()}
          className="w-20 bg-slate-950 text-white font-bold px-1 py-0.5 rounded outline-none border border-slate-700 text-center text-base"
          value={formatDisplayValue(value)}
          onChange={(e) => handleValueChange(e.target.value)}
          onBlur={() => setEditingValue(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setEditingValue(false);
          }}
        />
      ) : (
        <div className="flex items-center gap-1">
          {/* Step-to-Step Strikethrough Badge */}
          {hasStepHistory && (
            <span
              className="line-through text-white/60 font-mono text-xs px-1 rounded bg-black/20"
              title={`Previous step value was ${formatDisplayValue(prevStepValue)}`}
            >
              {formatDisplayValue(prevStepValue)}
            </span>
          )}

          {/* Active Current Value */}
          <span
            className="text-white font-bold cursor-pointer transition-all text-base"
            onClick={(e) => {
              e.stopPropagation();
              if (isInteractive) setEditingValue(true);
            }}
            title="Click to edit value"
          >
            {formatDisplayValue(value)}
          </span>
        </div>
      )}

      {/* Color Palette Toggle Icon on hover */}
      {isSelected && isInteractive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          className="p-1 rounded bg-black text-white hover:scale-110 transition-transform ml-1"
          title="Change variable color"
        >
          <Palette className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Color Palette Popover */}
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
