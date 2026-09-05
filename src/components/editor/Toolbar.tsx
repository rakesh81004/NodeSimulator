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
} from 'lucide-react';
import { VisualNodeType } from '../../types/simulation';

export const Toolbar: React.FC = () => {
  const { addObject, zoom, setZoom, resetView, simulation, updateSettings } = useSimulationStore();
  const { themeColor } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAdd = (type: VisualNodeType) => {
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
    { type: 'pointer' as VisualNodeType, label: 'Pointer', icon: Navigation, color: 'text-amber-400 hover:bg-amber-500/10' },
    { type: 'range' as VisualNodeType, label: 'Window Range', icon: ScanLine, color: 'text-violet-400 hover:bg-violet-500/10' },
    { type: 'text' as VisualNodeType, label: 'Quote Note', icon: FileText, color: 'text-indigo-400 hover:bg-indigo-500/10' },
  ];

  return (
    <>
      {/* Desktop Toolbar (Left Sidebar) */}
      <aside className="hidden md:flex w-14 md:w-16 bg-surface-900 border-r border-slate-800 flex-col items-center py-3 md:py-4 justify-between z-20 select-none overflow-y-auto">
        <div className="flex flex-col items-center gap-1.5 md:gap-2">
          <span className="text-[9px] md:text-[10px] font-mono uppercase text-slate-500 font-bold mb-0.5 tracking-wider">
            Nodes
          </span>
          {toolItems.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.type}
                type="button"
                onClick={() => handleAdd(tool.type)}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex flex-col items-center justify-center transition-all ${tool.color} group relative border border-transparent hover:border-slate-700/80 active:scale-95`}
                title={`Add ${tool.label}`}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                <div className="absolute left-14 px-2 py-1 bg-surface-950 border border-slate-700 rounded-md text-xs font-mono text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                  + Add {tool.label}
                </div>
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
