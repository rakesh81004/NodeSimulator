import React from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useTheme } from '../../utils/themeConfig';
import {
  ArrayVisualNode,
  StringVisualNode,
  VariableVisualNode,
  PointerVisualNode,
  TextVisualNode,
  StackVisualNode,
  RangeVisualNode,
  ArrayElement,
} from '../../types/simulation';
import {
  Trash2,
  Copy,
  Layers,
  Sliders,
  X,
  Edit3,
  Palette,
  Plus,
  LogOut,
} from 'lucide-react';

interface Props {
  onCloseMobile?: () => void;
}

export const PropertiesPanel: React.FC<Props> = ({ onCloseMobile }) => {
  const {
    simulation,
    currentStepIndex,
    selectedObjectId,
    setSelectedObjectId,
    updateObject,
    deleteObject,
    duplicateObject,
    bringToFront,
    sendToBack,
  } = useSimulationStore();
  const { themeColor } = useTheme();

  if (!simulation || !selectedObjectId) {
    return (
      <aside className="hidden lg:flex w-72 bg-surface-900 border-l border-slate-800 p-5 flex-col items-center justify-center text-center select-none">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300 mb-1">Properties Inspector</h4>
        <p className="text-xs text-slate-500 max-w-[200px]">
          Click any element on canvas to edit arrays, variables, pointers, and colors.
        </p>
      </aside>
    );
  }

  const currentStep = simulation.steps[currentStepIndex];
  const selectedNode = currentStep.objects.find((o) => o.id === selectedObjectId);

  if (!selectedNode) {
    return null;
  }

  const availableTargets = currentStep.objects.filter(
    (o) => o.type === 'array' || o.type === 'string' || o.type === 'stack'
  );

  const colorPresets = [
    { label: 'Theme', color: themeColor, highlight: 'none' },
    { label: 'Green', color: '#00c853', highlight: 'found' },
    { label: 'Yellow', color: '#ffd600', highlight: 'swapping' },
    { label: 'Purple', color: '#8b5cf6', highlight: 'window' },
    { label: 'Red', color: '#f43f5e', highlight: 'mismatch' },
    { label: 'Orange', color: '#ff9800', highlight: 'swapping' },
  ];

  // White is safe for accents/outlines (pointers, ranges, stack border) drawn on the
  // dark canvas, but omitted from `colorPresets` since those fill a box behind white text.
  const accentColorPresets = [
    ...colorPresets,
    { label: 'White', color: '#ffffff', highlight: 'none' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
        onClick={() => {
          setSelectedObjectId(null);
          if (onCloseMobile) onCloseMobile();
        }}
      />

      {/* Main Panel: Responsive Bottom Sheet on Mobile, Right Sidebar on Desktop */}
      <aside className="fixed inset-x-0 bottom-0 max-h-[55vh] rounded-t-3xl lg:rounded-none lg:static lg:max-h-full lg:w-72 bg-surface-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-y-auto select-none z-50 shadow-2xl lg:shadow-none animate-slide-up">
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-2 mb-1 lg:hidden" />

        {/* Header */}
        <div className="p-3.5 lg:p-4 border-b-2 border-slate-600 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold tracking-wider">
              Edit {selectedNode.type}
            </span>
            <h3 className="text-sm font-bold text-slate-200 truncate max-w-[140px]">
              {(selectedNode as any).data?.name || (selectedNode as any).data?.label || selectedNode.id}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => duplicateObject(selectedNode.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => deleteObject(selectedNode.id)}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedObjectId(null);
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4 flex-1">
          {/* Variable Node Configuration */}
          {selectedNode.type === 'variable' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-emerald-400">Variable Configuration</span>
              
              {/* Variable Type Selector */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Variable Type</label>
                <select
                  value={(selectedNode as VariableVisualNode).data.dataType || 'number'}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as VariableVisualNode).data, dataType: newType },
                    } as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-400 outline-none font-mono"
                >
                  <option value="number">Number (e.g. 15, -4)</option>
                  <option value="string">String / Character (e.g. a, val)</option>
                  <option value="boolean">Boolean (true / false)</option>
                  <option value="accumulator">Sum / Accumulator</option>
                  <option value="result">Result Flag (isValid)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Variable Name</label>
                <input
                  type="text"
                  value={(selectedNode as VariableVisualNode).data.name}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as VariableVisualNode).data, name: e.target.value },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Current Value</label>
                <input
                  type="text"
                  value={String((selectedNode as VariableVisualNode).data.value).replace(/^['"]|['"]$/g, '')}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/^['"]|['"]$/g, '');
                    const num = Number(cleanVal);
                    const finalVal = !isNaN(num) && cleanVal.trim() !== '' ? num : cleanVal;
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as VariableVisualNode).data, value: finalVal },
                    } as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-400 outline-none font-mono font-bold"
                />
              </div>

              {/* Color Preset Palette */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Color Theme</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        updateObject(selectedNode.id, {
                          style: { ...selectedNode.style, backgroundColor: p.color },
                        } as any)
                      }
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Array Node Configuration */}
          {selectedNode.type === 'array' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-sky-400">Array & Theme</span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Array Name (Optional)</label>
                <input
                  type="text"
                  value={(selectedNode as ArrayVisualNode).data.name || ''}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as ArrayVisualNode).data, name: e.target.value },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-400 outline-none font-mono"
                  placeholder="e.g. nums"
                />
              </div>

              {/* Whole Array Values Editor */}
              <div>
                <label className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                  <span>Whole Array (Comma Separated)</span>
                  <Edit3 className="w-3 h-3 text-sky-400" />
                </label>
                <textarea
                  rows={2}
                  value={(selectedNode as ArrayVisualNode).data.elements.map((el) => String(el.value).replace(/^['"]|['"]$/g, '')).join(', ')}
                  onChange={(e) => {
                    const rawTokens = e.target.value
                      .split(/[, ]+/)
                      .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
                      .filter((t) => t.length > 0);

                    const existing = (selectedNode as ArrayVisualNode).data.elements;
                    const nextElements: ArrayElement[] = rawTokens.map((tok, idx) => {
                      const numVal = Number(tok);
                      const val = !isNaN(numVal) ? numVal : tok;
                      return {
                        id: existing[idx]?.id || `c_${selectedNode.id}_${Date.now()}_${idx}`,
                        value: val,
                        highlight: existing[idx]?.highlight || 'none',
                      };
                    });

                    const cellSize = (selectedNode as ArrayVisualNode).data.cellSize || 56;
                    updateObject(selectedNode.id, {
                      width: nextElements.length * cellSize,
                      data: { ...(selectedNode as ArrayVisualNode).data, elements: nextElements },
                    } as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-400 outline-none font-mono resize-none leading-relaxed"
                  placeholder="e.g. 1, 3, 5, 7, 9, 11"
                />
              </div>

              {/* Apply Color Theme across Array */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Set Entire Array Color</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const nextEls = (selectedNode as ArrayVisualNode).data.elements.map((el) => ({
                          ...el,
                          color: p.color,
                          highlight: p.highlight as any,
                        }));
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as ArrayVisualNode).data, elements: nextEls },
                        } as any);
                      }}
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* String Node Configuration */}
          {selectedNode.type === 'string' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-sky-400">String & Theme</span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">String Name (Optional)</label>
                <input
                  type="text"
                  value={(selectedNode as StringVisualNode).data.name || ''}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as StringVisualNode).data, name: e.target.value },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-400 outline-none font-mono"
                  placeholder="e.g. s"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                  <span>Whole String Characters</span>
                  <Edit3 className="w-3 h-3 text-sky-400" />
                </label>
                <input
                  type="text"
                  value={(selectedNode as StringVisualNode).data.characters.map((c) => String(c.value).replace(/^['"]|['"]$/g, '')).join('')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^['"]|['"]$/g, '');
                    const existing = (selectedNode as StringVisualNode).data.characters;
                    const nextChars: ArrayElement[] = raw.split('').map((ch, idx) => ({
                      id: existing[idx]?.id || `ch_${selectedNode.id}_${Date.now()}_${idx}`,
                      value: ch,
                      highlight: existing[idx]?.highlight || 'none',
                    }));
                    const cellSize = (selectedNode as StringVisualNode).data.cellSize || 56;
                    updateObject(selectedNode.id, {
                      width: nextChars.length * cellSize,
                      data: { ...(selectedNode as StringVisualNode).data, characters: nextChars },
                    } as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-400 outline-none font-mono"
                  placeholder="e.g. radar"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Set Entire String Color</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const nextChars = (selectedNode as StringVisualNode).data.characters.map((ch) => ({
                          ...ch,
                          color: p.color,
                          highlight: p.highlight as any,
                        }));
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as StringVisualNode).data, characters: nextChars },
                        } as any);
                      }}
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stack Node Configuration */}
          {selectedNode.type === 'stack' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-purple-400">Stack & Theme</span>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Stack Name (Optional)</label>
                <input
                  type="text"
                  value={(selectedNode as StackVisualNode).data.name || ''}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as StackVisualNode).data, name: e.target.value },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-purple-400 outline-none font-mono"
                  placeholder="e.g. st"
                />
              </div>

              {/* Whole Stack Values Editor (bottom to top) */}
              <div>
                <label className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                  <span>Whole Stack (Bottom → Top, Comma Separated)</span>
                  <Edit3 className="w-3 h-3 text-purple-400" />
                </label>
                <textarea
                  rows={2}
                  value={(selectedNode as StackVisualNode).data.elements.map((el) => String(el.value).replace(/^['"]|['"]$/g, '')).join(', ')}
                  onChange={(e) => {
                    const rawTokens = e.target.value
                      .split(/[, ]+/)
                      .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
                      .filter((t) => t.length > 0);

                    const existing = (selectedNode as StackVisualNode).data.elements;
                    const nextElements: ArrayElement[] = rawTokens.map((tok, idx) => {
                      const numVal = Number(tok);
                      const val = !isNaN(numVal) ? numVal : tok;
                      return {
                        id: existing[idx]?.id || `stk_${selectedNode.id}_${Date.now()}_${idx}`,
                        value: val,
                        highlight: existing[idx]?.highlight || 'none',
                      };
                    });

                    const newHeight = Math.max(selectedNode.height, (nextElements.length * 44) + 60);
                    updateObject(selectedNode.id, {
                      height: newHeight,
                      data: { ...(selectedNode as StackVisualNode).data, elements: nextElements },
                    } as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-purple-400 outline-none font-mono resize-none leading-relaxed"
                  placeholder="e.g. 10, 20, 30"
                />
              </div>

              {/* Push / Pop Controls */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Push / Pop</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const elements = (selectedNode as StackVisualNode).data.elements;
                      const newEl: ArrayElement = {
                        id: `stk_${selectedNode.id}_${Date.now()}`,
                        value: String.fromCharCode(65 + elements.length),
                        highlight: 'pushing',
                      };
                      const nextElements = [...elements, newEl];
                      const newHeight = Math.max(selectedNode.height, (nextElements.length * 44) + 60);
                      updateObject(selectedNode.id, {
                        height: newHeight,
                        data: {
                          ...(selectedNode as StackVisualNode).data,
                          elements: nextElements,
                          lastAction: 'push',
                          lastPoppedValue: undefined,
                        },
                      } as any);
                    }}
                    className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs flex items-center justify-center gap-1.5 font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Push
                  </button>
                  <button
                    type="button"
                    disabled={(selectedNode as StackVisualNode).data.elements.length === 0}
                    onClick={() => {
                      const elements = (selectedNode as StackVisualNode).data.elements;
                      if (elements.length === 0) return;
                      const popped = elements[elements.length - 1];
                      const nextElements = elements.slice(0, -1);
                      updateObject(selectedNode.id, {
                        data: {
                          ...(selectedNode as StackVisualNode).data,
                          elements: nextElements,
                          lastAction: 'pop',
                          lastPoppedValue: popped.value,
                        },
                      } as any);
                    }}
                    className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs flex items-center justify-center gap-1.5 font-semibold transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Pop
                  </button>
                </div>
              </div>

              {/* Apply Color Theme across Stack */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Set Stack Outline Color</label>
                <div className="flex items-center gap-2">
                  {accentColorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        updateObject(selectedNode.id, {
                          style: { ...selectedNode.style, backgroundColor: p.color },
                        } as any)
                      }
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>

              {/* Per-Element Color */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Set Entire Stack Elements Color</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const nextEls = (selectedNode as StackVisualNode).data.elements.map((el) => ({
                          ...el,
                          color: p.color,
                          highlight: p.highlight as any,
                        }));
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as StackVisualNode).data, elements: nextEls },
                        } as any);
                      }}
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pointer Node Configuration */}
          {selectedNode.type === 'pointer' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-amber-400">Pointer Settings</span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Pointer Label (e.g. left, right, i, j)</label>
                <input
                  type="text"
                  value={(selectedNode as PointerVisualNode).data.label}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as PointerVisualNode).data, label: e.target.value },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-amber-400 outline-none font-mono font-bold"
                />
              </div>

              {/* Pointer Color */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Pointer Color</label>
                <div className="flex items-center gap-2">
                  {accentColorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as PointerVisualNode).data, color: p.color },
                        } as any)
                      }
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Attach Target (Array/String/Stack)</label>
                <select
                  value={(selectedNode as PointerVisualNode).data.targetNodeId || ''}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: {
                        ...(selectedNode as PointerVisualNode).data,
                        targetNodeId: e.target.value || undefined,
                        targetIndex: (selectedNode as PointerVisualNode).data.targetIndex ?? 0,
                      },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-amber-400 outline-none"
                >
                  <option value="">(Free Floating / Draggable)</option>
                  {availableTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t as any).data?.name || t.type}
                    </option>
                  ))}
                </select>
              </div>
              {(selectedNode as PointerVisualNode).data.targetNodeId && (
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Target Index</label>
                  <input
                    type="number"
                    min={0}
                    value={(selectedNode as PointerVisualNode).data.targetIndex ?? 0}
                    onChange={(e) =>
                      updateObject(selectedNode.id, {
                        data: {
                          ...(selectedNode as PointerVisualNode).data,
                          targetIndex: Math.max(0, Number(e.target.value)),
                        },
                      } as any)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-amber-400 outline-none font-mono font-bold"
                  />
                </div>
              )}
            </div>
          )}

          {/* Range / Window Node Configuration */}
          {selectedNode.type === 'range' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-violet-400">Window Range Settings</span>
              
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Window Title (e.g. Window, Subarray)</label>
                <input
                  type="text"
                  value={(selectedNode as RangeVisualNode).data.label || ''}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as RangeVisualNode).data, label: e.target.value },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-violet-400 outline-none font-mono"
                  placeholder="Window"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Start Label (L)</label>
                  <input
                    type="text"
                    value={(selectedNode as RangeVisualNode).data.startLabel || ''}
                    onChange={(e) =>
                      updateObject(selectedNode.id, {
                        data: { ...(selectedNode as RangeVisualNode).data, startLabel: e.target.value },
                      } as any)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-violet-400 outline-none font-mono font-bold"
                    placeholder="L"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">End Label (R)</label>
                  <input
                    type="text"
                    value={(selectedNode as RangeVisualNode).data.endLabel || ''}
                    onChange={(e) =>
                      updateObject(selectedNode.id, {
                        data: { ...(selectedNode as RangeVisualNode).data, endLabel: e.target.value },
                      } as any)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-violet-400 outline-none font-mono font-bold"
                    placeholder="R"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Attach Target (Array/String)</label>
                <select
                  value={(selectedNode as RangeVisualNode).data.targetNodeId || ''}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: {
                        ...(selectedNode as RangeVisualNode).data,
                        targetNodeId: e.target.value || undefined,
                        startIndex: (selectedNode as RangeVisualNode).data.startIndex ?? 0,
                        endIndex: (selectedNode as RangeVisualNode).data.endIndex ?? 2,
                      },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-violet-400 outline-none"
                >
                  <option value="">(Free Floating / Draggable)</option>
                  {availableTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t as any).data?.name || t.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start and End Index Adjusters */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Start Index</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (selectedNode as RangeVisualNode).data.startIndex ?? 0;
                        const next = Math.max(0, cur - 1);
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as RangeVisualNode).data, startIndex: next },
                        } as any);
                      }}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={(selectedNode as RangeVisualNode).data.startIndex ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as RangeVisualNode).data, startIndex: val },
                        } as any);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (selectedNode as RangeVisualNode).data.startIndex ?? 0;
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as RangeVisualNode).data, startIndex: cur + 1 },
                        } as any);
                      }}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">End Index</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (selectedNode as RangeVisualNode).data.endIndex ?? 0;
                        const next = Math.max(0, cur - 1);
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as RangeVisualNode).data, endIndex: next },
                        } as any);
                      }}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={(selectedNode as RangeVisualNode).data.endIndex ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as RangeVisualNode).data, endIndex: val },
                        } as any);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (selectedNode as RangeVisualNode).data.endIndex ?? 0;
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as RangeVisualNode).data, endIndex: cur + 1 },
                        } as any);
                      }}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Style Variant */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Window Style</label>
                <select
                  value={(selectedNode as RangeVisualNode).data.variant || 'bracket'}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as RangeVisualNode).data, variant: e.target.value as any },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-violet-400 outline-none font-mono"
                >
                  <option value="bracket">Algorithmic Bracket [ ... ]</option>
                  <option value="line">Span Line with Ticks</option>
                  <option value="double-arrow">Double-Ended Arrow ◄ ... ►</option>
                  <option value="window-box">Translucent Window Box</option>
                </select>
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Color Accent</label>
                <div className="flex items-center gap-2">
                  {accentColorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as RangeVisualNode).data, color: p.color },
                        } as any)
                      }
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Layer Controls */}
          <div className="pt-3 border-t-2 border-slate-600">
            <span className="text-xs font-semibold text-slate-400 block mb-1.5">Layer Ordering</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bringToFront(selectedNode.id)}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <Layers className="w-3 h-3" />
                Front
              </button>
              <button
                type="button"
                onClick={() => sendToBack(selectedNode.id)}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <Layers className="w-3 h-3" />
                Back
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
