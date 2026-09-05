import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause Animation' },
    { key: 'Delete / Backspace', desc: 'Delete selected visual node' },
    { key: 'Ctrl / ⌘ + C', desc: 'Copy selected visual node' },
    { key: 'Ctrl / ⌘ + V', desc: 'Paste copied visual node' },
    { key: 'Ctrl / ⌘ + D', desc: 'Duplicate selected node' },
    { key: 'Arrow Keys', desc: 'Nudge selected node position' },
    { key: 'Shift + Arrow', desc: 'Nudge node position by 10px' },
    { key: 'Double Click Cell', desc: 'Edit array/string cell value in-place' },
    { key: 'Double Click Var', desc: 'Edit variable value or name in-place' },
    { key: 'Middle Click + Drag', desc: 'Pan canvas workspace' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-950/60 border border-slate-800/60"
            >
              <span className="text-xs text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-indigo-300">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
