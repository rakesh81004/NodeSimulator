import React, { useRef, useEffect, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { StackVisualNode, ArrayElement } from '../../types/simulation';
import { useTheme } from '../../utils/themeConfig';
import { ArrowRight, Sparkles, Edit2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface StackState {
  stepIndex: number;
  stepId: string;
  stackNode: StackVisualNode | null;
  operation: 'empty' | 'push' | 'pop' | 'peek' | 'none';
  operationValue?: string | number;
}

interface StackTimelineViewProps {
  maxStates?: number;
  showAnimation?: boolean;
  editable?: boolean;
}

export const StackTimelineView: React.FC<StackTimelineViewProps> = ({ 
  maxStates = 5,
  showAnimation = true,
  editable = true
}) => {
  const { simulation, currentStepIndex, setCurrentStepIndex, updateObject } = useSimulationStore();
  const { themeColor, separatorColor } = useTheme();
  const [stackStates, setStackStates] = useState<StackState[]>([]);
  const [animatingElements, setAnimatingElements] = useState<Set<string>>(new Set());
  const [editingState, setEditingState] = useState<{ stepIndex: number; elementId: string } | null>(null);
  const [editingOperation, setEditingOperation] = useState<{ stepIndex: number } | null>(null);
  const [viewOffset, setViewOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract stack states from simulation steps
  useEffect(() => {
    if (!simulation) return;

    const states: StackState[] = [];
    const startIdx = Math.max(0, currentStepIndex - maxStates + 1);
    const endIdx = Math.min(simulation.steps.length - 1, currentStepIndex + maxStates - 1);

    for (let i = startIdx; i <= endIdx; i++) {
      const step = simulation.steps[i];
      const stackNode = step.objects.find(obj => obj.type === 'stack') as StackVisualNode | null;
      
      let operation: StackState['operation'] = 'none';
      let operationValue: string | number | undefined;

      if (stackNode) {
        const lastAction = stackNode.data.lastAction;
        if (lastAction === 'push') {
          operation = 'push';
          const elements = stackNode.data.elements;
          operationValue = elements.length > 0 ? elements[elements.length - 1].value : undefined;
        } else if (lastAction === 'pop') {
          operation = 'pop';
          operationValue = stackNode.data.lastPoppedValue;
        } else if (lastAction === 'peek') {
          operation = 'peek';
          const stackElements = stackNode.data.elements;
          operationValue = stackElements.length > 0 ? stackElements[stackElements.length - 1].value : undefined;
        } else if (stackNode.data.elements.length === 0) {
          operation = 'empty';
        }
      }

      states.push({
        stepIndex: i,
        stepId: step.id,
        stackNode,
        operation,
        operationValue,
      });
    }

    setStackStates(states);
  }, [simulation, currentStepIndex, maxStates]);

  // Handle push/pop animations
  useEffect(() => {
    if (!showAnimation) return;

    const currentState = stackStates.find(s => s.stepIndex === currentStepIndex);
    if (!currentState) return;

    // Trigger animation for push operations
    if (currentState.operation === 'push' && currentState.stackNode) {
      const elements = currentState.stackNode.data.elements;
      if (elements.length > 0) {
        const topElement = elements[elements.length - 1];
        setAnimatingElements(prev => new Set(prev).add(topElement.id));
        
        setTimeout(() => {
          setAnimatingElements(prev => {
            const next = new Set(prev);
            next.delete(topElement.id);
            return next;
          });
        }, 600);
      }
    }

    // Trigger animation for pop operations
    if (currentState.operation === 'pop' && currentState.operationValue !== undefined) {
      setAnimatingElements(prev => new Set(prev).add(`pop_${currentState.stepId}`));
      
      setTimeout(() => {
        setAnimatingElements(prev => {
          const next = new Set(prev);
          next.delete(`pop_${currentState.stepId}`);
          return next;
        });
      }, 600);
    }
  }, [currentStepIndex, stackStates, showAnimation]);

  const handleStateClick = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
  };

  const handleElementDoubleClick = (stepIndex: number, elementId: string) => {
    if (!editable) return;
    setEditingState({ stepIndex, elementId });
  };

  const handleElementEdit = (stepIndex: number, elementId: string, newValue: string) => {
    const step = simulation?.steps[stepIndex];
    if (!step) return;

    const stackNode = step.objects.find(obj => obj.type === 'stack') as StackVisualNode;
    if (!stackNode) return;

    const cleanVal = newValue.replace(/^['"]|['"]$/g, '');
    const num = Number(cleanVal);
    const value = !isNaN(num) && cleanVal.trim() !== '' ? num : cleanVal;

    const nextElements = stackNode.data.elements.map((el) => 
      el.id === elementId ? { ...el, value } : el
    );

    updateObject(stackNode.id, {
      data: { ...stackNode.data, elements: nextElements },
    } as any);

    setEditingState(null);
  };

  const handleOperationEdit = (stepIndex: number, newOperation: string) => {
    const step = simulation?.steps[stepIndex];
    if (!step) return;

    const stackNode = step.objects.find(obj => obj.type === 'stack') as StackVisualNode;
    if (!stackNode) return;

    // Parse operation string to extract action and value
    let action: 'push' | 'pop' | 'peek' | 'none' = 'none';
    let operationValue: string | number | undefined;

    if (newOperation.startsWith('push(')) {
      action = 'push';
      const match = newOperation.match(/push\((.*)\)/);
      if (match) {
        const val = match[1].replace(/^['"]|['"]$/g, '');
        const num = Number(val);
        operationValue = !isNaN(num) && val.trim() !== '' ? num : val;
      }
    } else if (newOperation.startsWith('pop(')) {
      action = 'pop';
      const match = newOperation.match(/pop\((.*)\)/);
      if (match) {
        const val = match[1].replace(/^['"]|['"]$/g, '');
        const num = Number(val);
        operationValue = !isNaN(num) && val.trim() !== '' ? num : val;
      }
    } else if (newOperation.startsWith('peek(')) {
      action = 'peek';
      const match = newOperation.match(/peek\((.*)\)/);
      if (match) {
        const val = match[1].replace(/^['"]|['"]$/g, '');
        const num = Number(val);
        operationValue = !isNaN(num) && val.trim() !== '' ? num : val;
      }
    } else if (newOperation === 'empty stack') {
      action = 'none';
    }

    updateObject(stackNode.id, {
      data: { 
        ...stackNode.data, 
        lastAction: action,
        lastPoppedValue: action === 'pop' ? operationValue : undefined,
      },
    } as any);

    setEditingOperation(null);
  };

  const formatDisplayValue = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).replace(/^['"]|['"]$/g, '');
  };

  const getOperationLabel = (state: StackState) => {
    switch (state.operation) {
      case 'empty':
        return 'empty stack';
      case 'push':
        return `push(${formatDisplayValue(state.operationValue)})`;
      case 'pop':
        return `pop(${formatDisplayValue(state.operationValue)})`;
      case 'peek':
        return `peek(${formatDisplayValue(state.operationValue)})`;
      default:
        return state.stackNode?.data.elements.length === 0 ? 'empty stack' : 'no operation';
    }
  };

  const getOperationColor = (operation: StackState['operation'], isCurrentState: boolean) => {
    const baseColor = isCurrentState ? themeColor : undefined;
    
    switch (operation) {
      case 'push':
        return isCurrentState 
          ? { backgroundColor: `${themeColor}33`, borderColor: themeColor, color: themeColor }
          : { backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 0.5)', color: 'rgb(110, 231, 183)' };
      case 'pop':
        return isCurrentState
          ? { backgroundColor: `${themeColor}33`, borderColor: themeColor, color: themeColor }
          : { backgroundColor: 'rgba(244, 63, 94, 0.5)', borderColor: 'rgba(244, 63, 94, 0.5)', color: 'rgb(251, 113, 133)' };
      case 'peek':
        return isCurrentState
          ? { backgroundColor: `${themeColor}33`, borderColor: themeColor, color: themeColor }
          : { backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(245, 158, 11, 0.5)', color: 'rgb(253, 186, 116)' };
      case 'empty':
        return isCurrentState
          ? { backgroundColor: `${themeColor}33`, borderColor: themeColor, color: themeColor }
          : { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(71, 85, 105, 0.5)', color: 'rgb(148, 163, 184)' };
      default:
        return isCurrentState
          ? { backgroundColor: `${themeColor}33`, borderColor: themeColor, color: themeColor }
          : { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(71, 85, 105, 0.5)', color: 'rgb(148, 163, 184)' };
    }
  };

  return (
    <div className="w-full bg-surface-950 border-t border-slate-700">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-slate-300">Stack Timeline Visualization</span>
        </div>
        
        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewOffset(Math.max(0, viewOffset - 1))}
            disabled={viewOffset === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous states"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-500">
            {viewOffset + 1}-{Math.min(viewOffset + maxStates, stackStates.length)} / {stackStates.length}
          </span>
          <button
            onClick={() => setViewOffset(Math.min(stackStates.length - maxStates, viewOffset + 1))}
            disabled={viewOffset >= stackStates.length - maxStates}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next states"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex items-start gap-6 p-6 overflow-x-auto"
        style={{ minHeight: '280px' }}
      >
        {stackStates.slice(viewOffset, viewOffset + maxStates).map((state, idx) => {
          const actualIndex = viewOffset + idx;
          const isCurrentState = state.stepIndex === currentStepIndex;
          const isAnimating = animatingElements.has(`pop_${state.stepId}`);
          
          return (
            <div key={state.stepId} className="flex flex-col items-center gap-3 flex-shrink-0">
              {/* Step indicator */}
              <div className={`text-xs font-mono px-2 py-1 rounded ${
                isCurrentState 
                  ? 'bg-purple-900/50 border text-purple-300' 
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-500'
              }`}
              style={{
                borderColor: themeColor,
                color: isCurrentState ? themeColor : undefined,
              }}
              >
                Step {state.stepIndex + 1}
              </div>

              {/* Curved arrow to next state (except last in current view) */}
              {actualIndex < Math.min(viewOffset + maxStates, stackStates.length) - 1 && (
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                  <ArrowRight className="w-5 h-5 text-slate-600" />
                </div>
              )}

              {/* U-shaped stack container */}
              <div
                onClick={() => handleStateClick(state.stepIndex)}
                className="relative cursor-pointer transition-all"
                style={{
                  width: '140px',
                  minHeight: '180px',
                  outline: isCurrentState ? `2px solid ${themeColor}` : 'none',
                  outlineOffset: '2px',
                  boxShadow: isCurrentState ? `0 10px 25px -5px ${themeColor}40` : undefined,
                }}
              >
                {/* Edit button (when editable and current state) */}
                {editable && isCurrentState && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingOperation({ stepIndex: state.stepIndex });
                    }}
                    className="absolute -top-3 -right-3 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border z-20"
                    style={{ borderColor: themeColor }}
                    title="Edit operation"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                {/* Stack container body */}
                <div className="absolute inset-0 flex flex-col-reverse border-x-4 border-b-4 border-t-0 rounded-b-lg bg-black/50"
                  style={{ 
                    borderColor: themeColor,
                    minHeight: '180px'
                  }}
                >
                  {/* Stack elements */}
                  {state.stackNode?.data.elements && state.stackNode.data.elements.length > 0 ? (
                    state.stackNode.data.elements.map((el, elIdx) => {
                      const isTop = elIdx === state.stackNode!.data.elements.length - 1;
                      const isElementAnimating = animatingElements.has(el.id);
                      const isPushAnimating = isTop && state.operation === 'push' && isCurrentState;
                      const isEditing = editingState?.stepIndex === state.stepIndex && editingState?.elementId === el.id;
                      
                      return (
                        <div
                          key={el.id}
                          onDoubleClick={() => handleElementDoubleClick(state.stepIndex, el.id)}
                          className="w-full py-2 px-3 font-sans font-bold text-center text-white mb-1 last:mb-0 flex items-center justify-between transition-all"
                          style={{
                            backgroundColor: isTop ? themeColor : `${themeColor}99`,
                            borderRadius: '6px',
                            border: `2px solid ${themeColor}40`,
                            transform: isPushAnimating ? 'translateY(-20px) scale(1.05)' : 'translateY(0)',
                            opacity: isPushAnimating ? 0.8 : 1,
                            boxShadow: isTop ? `0 4px 12px ${themeColor}40` : 'none',
                            cursor: editable ? 'pointer' : 'default',
                          }}
                        >
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${themeColor}33`, color: themeColor }}>
                            {elIdx}
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              className="flex-1 text-white font-bold text-center outline-none rounded px-1"
                              style={{ backgroundColor: `${themeColor}33`, border: `1px solid ${themeColor}` }}
                              value={formatDisplayValue(el.value)}
                              onChange={(e) => handleElementEdit(state.stepIndex, el.id, e.target.value)}
                              onBlur={() => setEditingState(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') setEditingState(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="flex-1 text-center font-bold">
                              {formatDisplayValue(el.value)}
                            </span>
                          )}
                          {isTop && (
                            <span className="text-[8px] px-1 py-0.2 rounded text-white font-bold" style={{ backgroundColor: `${themeColor}66` }}>
                              TOP
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-sans py-8">
                      <span className="opacity-50">empty</span>
                    </div>
                  )}

                  {/* Pop animation overlay */}
                  {isAnimating && state.operationValue !== undefined && (
                    <div className="absolute inset-0 flex items-start justify-center pt-2 pointer-events-none">
                      <div
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-lg animate-bounce"
                        style={{
                          animation: 'popUp 0.6s ease-out forwards',
                        }}
                      >
                        {formatDisplayValue(state.operationValue)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Open top indicator */}
                <div className="absolute -top-1 left-0 right-0 h-2 border-t-4 border-dashed rounded-t-lg"
                  style={{ borderColor: themeColor }}
                />
              </div>

              {/* Operation label */}
              {editingOperation?.stepIndex === state.stepIndex ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    className="text-xs font-mono px-2 py-1 rounded-lg border bg-slate-900 text-white outline-none w-32"
                    style={{ borderColor: themeColor }}
                    defaultValue={getOperationLabel(state)}
                    onBlur={(e) => handleOperationEdit(state.stepIndex, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleOperationEdit(state.stepIndex, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingOperation(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingOperation(null);
                    }}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white"
                    style={{ borderColor: themeColor }}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div 
                  className="text-xs font-mono px-3 py-1.5 rounded-lg border"
                  style={{
                    ...getOperationColor(state.operation, isCurrentState),
                    outline: isCurrentState ? `2px solid ${themeColor}40` : 'none',
                    outlineOffset: '2px',
                    cursor: editable && isCurrentState ? 'pointer' : 'default',
                  }}
                  onDoubleClick={() => editable && isCurrentState && setEditingOperation({ stepIndex: state.stepIndex })}
                >
                  {getOperationLabel(state)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom animation styles */}
      <style>{`
        @keyframes popUp {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-40px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};