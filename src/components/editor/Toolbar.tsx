import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useTheme } from '../../utils/themeConfig';
import {
  List,
  Type,
  Variable,
  Navigation,
  FileText,
  MoveRight,
  Square,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  X,
  ScanLine,
  RectangleHorizontal,
} from 'lucide-react';
import { VisualNodeType } from '../../types/simulation';

export const Toolbar: React.FC = () => {
  const { addObject, zoom, setZoom, resetView, simulation, updateSettings, activeTool, setActiveTool } = useSimulationStore();
  const { themeColor } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAdd = (type: VisualNodeType, drawable?: boolean) => {
    if (drawable) {
      // Arm the tool instead of placing immediately -- the next click-drag
      // on the canvas draws the shape at that position/size, Figma-style.
      setActiveTool(activeTool === type ? null : type);
      setMobileMenuOpen(false);
      return;
    }
    addObject(type);
    setMobileMenuOpen(false);
  };

  const toggleSnap = () => {
    if (!simulation) return;
    updateSettings({ snapToGrid: !simulation.settings.snapToGrid });
  };

  const toolItems = [
    { type: 'array' as VisualNodeType, label: 'Array', icon: List, color: 'text-sky-400 hover:bg-sky-500/10' },
    { type: 'stack' as VisualNodeType, label: 'Stack', icon: Layers, color: 'text-purple-400 hover:bg-purple-500/10' },
    { type: 'string' as VisualNodeType, label: 'String', icon: Type, color: 'text-cyan-400 hover:bg-cyan-500/10' },
    { type: 'variable' as VisualNodeType, label: 'Variable', icon: Variable, color: 'text-emerald-400 hover:bg-emerald-500/10' },
    { type: 'value' as VisualNodeType, label: 'Value Box', icon: Square, color: 'text-rose-400 hover:bg-rose-500/10' },
    { type: 'pointer' as VisualNodeType, label: 'Pointer', icon: Navigation, color: 'text-amber-400 hover:bg-amber-500/10' },
    { type: 'range' as VisualNodeType, label: 'Window Range', icon: ScanLine, color: 'text-violet-400 hover:bg-violet-500/10' },
    { type: 'box' as VisualNodeType, label: 'Rectangle', icon: RectangleHorizontal, color: 'text-slate-300 hover:bg-slate-500/10', drawable: true },
    { type: 'text' as VisualNodeType, label: 'Quote Note', icon: FileText, color: 'text-indigo-400 hover:bg-indigo-500/10' },
  ];

  return (
    <>
      {/* Desktop Toolbar (Left Sidebar) */}
      <aside className="hidden md:flex w-20 bg-surface-900 border-r border-slate-800 flex-col items-center py-3 md:py-4 justify-between z-20 select-none overflow-y-auto">
        <div className="flex flex-col items-center gap-1.5 md:gap-2 w-full px-1.5">
          <span className="text-[9px] md:text-[10px] font-mono uppercase text-slate-500 font-bold mb-0.5 tracking-wider">
            Nodes
          </span>
          {toolItems.map((tool) => {
            const Icon = tool.icon;
            const isArmed = tool.drawable && activeTool === tool.type;
            return (
              <button
                key={tool.type}
                type="button"
                onClick={() => handleAdd(tool.type, tool.drawable)}
                className={`w-full py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${tool.color} border active:scale-95 ${
                  isArmed ? 'border-indigo-400 bg-indigo-500/10' : 'border-transparent hover:border-slate-700/80'
                }`}
                title={tool.drawable ? `Draw ${tool.label} (click-drag on canvas)` : `Add ${tool.label}`}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-[9px] font-mono leading-tight text-center">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Zoom & View Controls */}
        <div className="flex flex-col items-center gap-1 md:gap-2 pt-2 border-t-2 border-slate-600 w-full px-1">
          <button
            type="button"
            onClick={() => setZoom(zoom + 0.1)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(zoom - 0.1)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="w-9 h-9 md:w-10 md:h-10 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Floating Action Button & Menu Dock */}
      <div className="md:hidden fixed bottom-18 left-4 z-40">
        {mobileMenuOpen ? (
          <div className="bg-surface-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2 shadow-2xl flex flex-col gap-2 animate-scale-in">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Add Node</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {toolItems.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.type}
                    type="button"
                    // Touch has no click-drag draw gesture wired up yet, so
                    // mobile always places the shape at a default size/position.
                    onClick={() => handleAdd(tool.type)}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 ${tool.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] font-mono">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-11 h-11 rounded-2xl text-white flex items-center justify-center transition-all active:scale-95"
            style={{ backgroundColor: themeColor }}
            title="Add Node"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
};
