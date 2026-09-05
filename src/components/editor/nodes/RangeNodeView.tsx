import React, { useState } from 'react';
import { RangeVisualNode, ArrayVisualNode, StringVisualNode } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';

interface Props {
  node: RangeVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const RangeNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject, simulation, currentStepIndex } = useSimulationStore();
  const { themeColor } = useTheme();

  const [editingLabel, setEditingLabel] = useState(false);
  const [editingStartLabel, setEditingStartLabel] = useState(false);
  const [editingEndLabel, setEditingEndLabel] = useState(false);

  const {
    label = 'Window',
    startLabel = 'L',
    endLabel = 'R',
    startIndex = 0,
    endIndex = 2,
    variant = 'bracket',
    color = '#8b5cf6',
    showIndices = true,
    showLength = true,
    targetNodeId,
  } = node.data;

  const rangeColor = color || themeColor;
  const currentStep = simulation?.steps[currentStepIndex];
  const targetNode = targetNodeId && currentStep
    ? (currentStep.objects.find((o) => o.id === targetNodeId) as ArrayVisualNode | StringVisualNode | undefined)
    : undefined;

  const totalCells = targetNode
    ? targetNode.type === 'array'
      ? targetNode.data.elements?.length || 1
      : targetNode.data.characters?.length || 1
    : undefined;

  const windowLen = Math.max(1, Math.abs(endIndex - startIndex) + 1);

  const handleLabelChange = (newVal: string) => {
    updateObject(node.id, {
      data: { ...node.data, label: newVal },
    } as any);
  };

  const handleStartLabelChange = (newVal: string) => {
    updateObject(node.id, {
      data: { ...node.data, startLabel: newVal },
    } as any);
  };

  const handleEndLabelChange = (newVal: string) => {
    updateObject(node.id, {
      data: { ...node.data, endLabel: newVal },
    } as any);
  };

  const adjustStartIndex = (delta: number) => {
    const nextStart = Math.max(0, startIndex + delta);
    const maxEnd = totalCells ? totalCells - 1 : 99;
    const clampedStart = Math.min(maxEnd, nextStart);
    updateObject(node.id, {
      data: {
        ...node.data,
        startIndex: clampedStart,
        endIndex: Math.max(clampedStart, endIndex),
      },
    } as any);
  };

  const adjustEndIndex = (delta: number) => {
    const maxEnd = totalCells ? totalCells - 1 : 99;
    const nextEnd = Math.max(startIndex, Math.min(maxEnd, endIndex + delta));
    updateObject(node.id, {
      data: { ...node.data, endIndex: nextEnd },
    } as any);
  };

  const width = Math.max(80, node.width || 180);
  const height = Math.max(44, node.height || 54);

  // Render Window Box Variant
  if (variant === 'window-box') {
    return (
      <div
        className={`relative rounded-xl pointer-events-auto transition-all ${
          isSelected ? 'ring-2 ring-white/90 shadow-2xl' : ''
        }`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: `${rangeColor}18`,
          border: `2px dashed ${rangeColor}`,
          boxShadow: `0 0 16px ${rangeColor}30`,
        }}
      >
        {/* Floating Top Badge with Label & Length */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] flex items-center gap-1.5 shadow-lg border backdrop-blur-md"
          style={{
            backgroundColor: '#070b14',
            borderColor: rangeColor,
            color: rangeColor,
          }}
        >
          {editingLabel && isInteractive ? (
            <input
              type="text"
              autoFocus
              className="bg-transparent outline-none w-16 text-center text-[11px] font-mono text-white"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(false);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onDoubleClick={() => isInteractive && setEditingLabel(true)}
              className="cursor-pointer hover:underline"
              title="Double click to edit label"
            >
              {label || 'Window'}
            </span>
          )}

          {showLength && (
            <span className="text-[10px] opacity-80 border-l border-slate-700 pl-1">
              len: {windowLen}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Render Algorithmic Bracket & Span Line Variants
  return (
    <div
      className={`relative select-none flex flex-col justify-end transition-all ${
        isSelected ? 'scale-[1.02]' : ''
      }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Top Header: Central Badge with Range Details */}
      <div className="flex items-center justify-between w-full px-1 mb-1">
        {/* Start Pointer Label (e.g. L) */}
        <div className="flex items-center gap-0.5">
          {editingStartLabel && isInteractive ? (
            <input
              type="text"
              autoFocus
              className="bg-slate-900 border rounded px-1 text-[11px] font-mono font-bold text-center w-8 text-white outline-none"
              style={{ borderColor: rangeColor }}
              value={startLabel}
              onChange={(e) => handleStartLabelChange(e.target.value)}
              onBlur={() => setEditingStartLabel(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingStartLabel(false);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isInteractive) setEditingStartLabel(true);
              }}
              className="px-1.5 py-0.5 rounded font-mono font-black text-xs md:text-sm tracking-tight cursor-pointer transition-transform hover:scale-110 shadow-sm"
              style={{
                backgroundColor: `${rangeColor}25`,
                color: rangeColor,
                border: `1px solid ${rangeColor}60`,
              }}
              title="Click to edit start pointer label (e.g. L, i, start)"
            >
              {startLabel}
            </button>
          )}

          {/* Start Stepper adjustment on selected */}
          {isSelected && isInteractive && targetNode && (
            <div className="flex items-center gap-0.5 ml-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustStartIndex(-1);
                }}
                className="w-4 h-4 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px]"
                title="Decrease start index"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustStartIndex(1);
                }}
                className="w-4 h-4 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px]"
                title="Increase start index"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Center Badge: Window Title & Length */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] shadow-lg border backdrop-blur-md"
          style={{
            backgroundColor: '#070b14ee',
            borderColor: `${rangeColor}90`,
            color: rangeColor,
            boxShadow: `0 0 12px ${rangeColor}40`,
          }}
        >
          {editingLabel && isInteractive ? (
            <input
              type="text"
              autoFocus
              className="bg-transparent outline-none w-20 text-center text-[11px] font-mono text-white"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(false);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (isInteractive) setEditingLabel(true);
              }}
              className="cursor-pointer hover:underline"
              title="Click to edit window name"
            >
              {label || 'Window'}
            </span>
          )}

          {showIndices && (
            <span className="text-[10px] text-slate-300 font-normal">
              [{startIndex}..{endIndex}]
            </span>
          )}

          {showLength && (
            <span className="text-[10px] font-black px-1 rounded bg-white/10 text-white">
              k={windowLen}
            </span>
          )}
        </div>

        {/* End Pointer Label (e.g. R) */}
        <div className="flex items-center gap-0.5">
          {isSelected && isInteractive && targetNode && (
            <div className="flex items-center gap-0.5 mr-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustEndIndex(-1);
                }}
                className="w-4 h-4 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px]"
                title="Decrease end index"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustEndIndex(1);
                }}
                className="w-4 h-4 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px]"
                title="Increase end index"
              >
                ›
              </button>
            </div>
          )}

          {editingEndLabel && isInteractive ? (
            <input
              type="text"
              autoFocus
              className="bg-slate-900 border rounded px-1 text-[11px] font-mono font-bold text-center w-8 text-white outline-none"
              style={{ borderColor: rangeColor }}
              value={endLabel}
              onChange={(e) => handleEndLabelChange(e.target.value)}
              onBlur={() => setEditingEndLabel(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingEndLabel(false);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isInteractive) setEditingEndLabel(true);
              }}
              className="px-1.5 py-0.5 rounded font-mono font-black text-xs md:text-sm tracking-tight cursor-pointer transition-transform hover:scale-110 shadow-sm"
              style={{
                backgroundColor: `${rangeColor}25`,
                color: rangeColor,
                border: `1px solid ${rangeColor}60`,
              }}
              title="Click to edit end pointer label (e.g. R, j, end)"
            >
              {endLabel}
            </button>
          )}
        </div>
      </div>

      {/* Bracket Line Graphic: High-tech Horizontal Bridge with End Ticks */}
      <div className="relative w-full h-4 flex items-center">
        {/* Left vertical cap */}
        <div
          className="w-1 h-3.5 rounded-t"
          style={{
            backgroundColor: rangeColor,
            boxShadow: `0 0 8px ${rangeColor}`,
          }}
        />

        {/* Horizontal span bridge line */}
        <div
          className="flex-1 h-1 relative"
          style={{
            backgroundColor: rangeColor,
            boxShadow: `0 0 8px ${rangeColor}80`,
          }}
        >
          {variant === 'double-arrow' && (
            <div className="absolute inset-0 flex items-center justify-between px-1 text-white">
              <span className="text-[10px] leading-none">◀</span>
              <span className="text-[10px] leading-none">▶</span>
            </div>
          )}
        </div>

        {/* Right vertical cap */}
        <div
          className="w-1 h-3.5 rounded-t"
          style={{
            backgroundColor: rangeColor,
            boxShadow: `0 0 8px ${rangeColor}`,
          }}
        />
      </div>
    </div>
  );
};
