import React from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useTheme } from '../../utils/themeConfig';
import {
  ArrayVisualNode,
  StringVisualNode,
  VariableVisualNode,
  ValueVisualNode,
  PointerVisualNode,
  TextVisualNode,
  StackVisualNode,
  RangeVisualNode,
  HighlightVisualNode,
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
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lock,
  Unlock,
} from 'lucide-react';
import { generateSimulationFromCode } from '../../parser/dsaCodeSimulator';

interface Props {
  onCloseMobile?: () => void;
}

export const PropertiesPanel: React.FC<Props> = ({ onCloseMobile }) => {
  const {
    simulation,
    currentStepIndex,
    selectedObjectId,
    selectedObjectIds,
    setSelectedObjectId,
    updateObject,
    deleteObject,
    deleteSelectedObjects,
    duplicateObject,
    duplicateSelectedObjects,
    copySelectedObjects,
    bringToFront,
    sendToBack,
    regenerateSteps,
  } = useSimulationStore();
  const { themeColor } = useTheme();

  if (simulation && selectedObjectIds.length > 1) {
    return (
      <aside className="hidden lg:flex w-72 bg-surface-900 border-l border-slate-800 p-5 flex-col items-center justify-center text-center select-none gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1">{selectedObjectIds.length} objects selected</h4>
          <p className="text-xs text-slate-500 max-w-[220px]">
            Drag any of them to move the whole group. Copy, duplicate, and delete apply to all of them together.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => copySelectedObjects()}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Copy group (Ctrl/Cmd+C)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => duplicateSelectedObjects()}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Duplicate group (Ctrl/Cmd+D)"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => deleteSelectedObjects()}
            className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            title="Delete group (Delete)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  if (!simulation || !selectedObjectId) {
    return (
      <aside className="hidden lg:flex w-72 bg-surface-900 border-l border-slate-800 p-5 flex-col items-center justify-center text-center select-none">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300 mb-1">Properties Inspector</h4>
        <p className="text-xs text-slate-500 max-w-[200px]">
          Click any element on canvas to edit arrays, variables, pointers, and colors. Drag on empty canvas to select multiple.
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

  // Simulations created via Import Code remember which algorithm/code generated them,
  // so editing the input here can re-run that same logic instead of just editing text.
  const canRerunDryRun = Boolean(simulation.sourceAlgorithmType);

  const handleRerunDryRun = () => {
    if (!simulation.sourceAlgorithmType) return;

    let inputData: Record<string, any> = {};

    if (selectedNode.type === 'array') {
      const values = (selectedNode as ArrayVisualNode).data.elements.map((el) => el.value);
      if (simulation.sourceAlgorithmType === 'two-sum') {
        const targetVar = currentStep.objects.find(
          (o) => o.type === 'variable' && (o as VariableVisualNode).data.name === 'target'
        ) as VariableVisualNode | undefined;
        inputData = {
          nums: values.map((v) => Number(v)).filter((n) => !isNaN(n)),
          target: targetVar ? Number(targetVar.data.value) : 9,
        };
      } else {
        inputData = { s: values.join(', ') };
      }
    } else if (selectedNode.type === 'string') {
      const s = (selectedNode as StringVisualNode).data.characters.map((c) => c.value).join('');
      inputData = { s };
    }

    const generated = generateSimulationFromCode({
      algorithmType: simulation.sourceAlgorithmType as any,
      code: simulation.sourceCode || '',
      language: (simulation.sourceLanguage as any) || 'java',
      inputData,
    });

    regenerateSteps(generated.steps);
    setSelectedObjectId(null);
  };

  const rerunButton = canRerunDryRun ? (
    <button
      type="button"
      onClick={handleRerunDryRun}
      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
    >
      <RefreshCw className="w-3.5 h-3.5" />
      Re-run Dry Run with This Input
    </button>
  ) : null;

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
              onClick={() => updateObject(selectedNode.id, { locked: !selectedNode.locked } as any)}
              className={`p-1.5 rounded-lg hover:bg-slate-800 ${
                selectedNode.locked ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
              title={selectedNode.locked ? 'Unlock -- allow selecting on canvas again' : 'Lock -- clicks on canvas will pass through to whatever is underneath'}
            >
              {selectedNode.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
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

          {/* Value Box Configuration */}
          {selectedNode.type === 'value' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-rose-400">Value Box Configuration</span>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Value Type</label>
                <select
                  value={(selectedNode as ValueVisualNode).data.dataType || 'number'}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as ValueVisualNode).data, dataType: e.target.value as any },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-rose-400 outline-none font-mono"
                >
                  <option value="number">Number (e.g. 15, -4)</option>
                  <option value="string">String / Character (e.g. a, val)</option>
                  <option value="boolean">Boolean (true / false)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Value</label>
                <input
                  type="text"
                  value={String((selectedNode as ValueVisualNode).data.value).replace(/^['"]|['"]$/g, '')}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/^['"]|['"]$/g, '');
                    const num = Number(cleanVal);
                    const finalVal = !isNaN(num) && cleanVal.trim() !== '' ? num : cleanVal;
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as ValueVisualNode).data, value: finalVal },
                    } as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-rose-400 outline-none font-mono font-bold"
                />
              </div>

              {/* Red Cross Mark Toggle */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cross Mark</label>
                <button
                  type="button"
                  onClick={() =>
                    updateObject(selectedNode.id, {
                      data: {
                        ...(selectedNode as ValueVisualNode).data,
                        strikethrough: !(selectedNode as ValueVisualNode).data.strikethrough,
                      },
                    } as any)
                  }
                  className={`w-full py-1.5 px-2 rounded text-xs flex items-center justify-center gap-1.5 font-semibold transition-colors ${
                    (selectedNode as ValueVisualNode).data.strikethrough
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  {(selectedNode as ValueVisualNode).data.strikethrough ? 'Cross Mark On' : 'Cross Mark Off'}
                </button>
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

              {rerunButton}
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

              {rerunButton}
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

              {/* Arrow Direction */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Arrow Direction</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { dir: 'up', icon: ArrowUp, title: 'Points up (pointer sits below the array)' },
                      { dir: 'down', icon: ArrowDown, title: 'Points down (pointer sits above the array)' },
                      { dir: 'left', icon: ArrowLeft, title: 'Points left (pointer sits to the right of the array)' },
                      { dir: 'right', icon: ArrowRight, title: 'Points right (pointer sits to the left of the array)' },
                    ] as const
                  ).map(({ dir, icon: DirIcon, title }) => {
                    const isActive = ((selectedNode as PointerVisualNode).data.direction || 'up') === dir;
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() =>
                          updateObject(selectedNode.id, {
                            data: { ...(selectedNode as PointerVisualNode).data, direction: dir },
                          } as any)
                        }
                        className={`py-1.5 rounded flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                        title={title}
                      >
                        <DirIcon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
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

          {selectedNode.type === 'highlight' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-300">Rectangle</span>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={(selectedNode as HighlightVisualNode).data.label || ''}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as HighlightVisualNode).data, label: e.target.value },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-slate-400 outline-none font-mono"
                  placeholder="No label"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Width</label>
                  <input
                    type="number"
                    min={40}
                    value={selectedNode.width}
                    onChange={(e) => updateObject(selectedNode.id, { width: Math.max(40, Number(e.target.value)) } as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white text-center focus:border-slate-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Height</label>
                  <input
                    type="number"
                    min={30}
                    value={selectedNode.height}
                    onChange={(e) => updateObject(selectedNode.id, { height: Math.max(30, Number(e.target.value)) } as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white text-center focus:border-slate-400 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Style</label>
                <select
                  value={(selectedNode as HighlightVisualNode).data.variant || 'filled'}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      data: { ...(selectedNode as HighlightVisualNode).data, variant: e.target.value as any },
                    } as any)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-slate-400 outline-none font-mono"
                >
                  <option value="filled">Solid Fill</option>
                  <option value="dashed">Dashed Outline</option>
                  <option value="glow">Glow Outline</option>
                  <option value="window">Highlight Window</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fill Color</label>
                <div className="flex items-center gap-2">
                  {accentColorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as HighlightVisualNode).data, fillColor: p.color },
                          style: { ...selectedNode.style, backgroundColor: p.color },
                        } as any)
                      }
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={(selectedNode as HighlightVisualNode).data.fillColor || '#64748b'}
                    onChange={(e) =>
                      updateObject(selectedNode.id, {
                        data: { ...(selectedNode as HighlightVisualNode).data, fillColor: e.target.value },
                        style: { ...selectedNode.style, backgroundColor: e.target.value },
                      } as any)
                    }
                    className="w-6 h-6 rounded-full border-2 border-white/60 cursor-pointer bg-transparent"
                    title="Custom fill color"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Opacity ({Math.round((selectedNode.style.opacity ?? 1) * 100)}%)
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={Math.round((selectedNode.style.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    updateObject(selectedNode.id, {
                      style: { ...selectedNode.style, opacity: Number(e.target.value) / 100 },
                    } as any)
                  }
                  className="w-full accent-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Border Color</label>
                <div className="flex items-center gap-2">
                  {accentColorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        updateObject(selectedNode.id, {
                          data: { ...(selectedNode as HighlightVisualNode).data, color: p.color },
                          style: { ...selectedNode.style, borderColor: p.color },
                        } as any)
                      }
                      className="w-6 h-6 rounded-full border-2 border-white/60 hover:scale-125 transition-transform"
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={(selectedNode as HighlightVisualNode).data.color || '#94a3b8'}
                    onChange={(e) =>
                      updateObject(selectedNode.id, {
                        data: { ...(selectedNode as HighlightVisualNode).data, color: e.target.value },
                        style: { ...selectedNode.style, borderColor: e.target.value },
                      } as any)
                    }
                    className="w-6 h-6 rounded-full border-2 border-white/60 cursor-pointer bg-transparent"
                    title="Custom border color"
                  />
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
