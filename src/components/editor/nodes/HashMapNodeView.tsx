import React, { useState } from 'react';
import { HashMapVisualNode, HashMapEntry } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { useIsLightTheme } from '../../../utils/canvasTheme';
import { Plus, X } from 'lucide-react';

interface Props {
  node: HashMapVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const HashMapNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject } = useSimulationStore();
  const { themeColor } = useTheme();
  const isLight = useIsLightTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'key' | 'value' | null>(null);

  const { name = 'map', entries = [] } = node.data;
  const primaryColor = (node.style as any)?.borderColor || themeColor;

  const formatVal = (v: any) => {
    if (v === undefined || v === null) return '';
    return String(v).replace(/^['"]|['"]$/g, '');
  };

  const parseVal = (raw: string): string | number => {
    const clean = raw.replace(/^['"]|['"]$/g, '');
    const num = Number(clean);
    return !isNaN(num) && clean.trim() !== '' ? num : clean;
  };

  const updateEntries = (nextEntries: HashMapEntry[]) => {
    updateObject(node.id, { data: { ...node.data, entries: nextEntries } } as any);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newEntry: HashMapEntry = {
      id: `hm_${node.id}_${Date.now()}`,
      key: `k${entries.length}`,
      value: 0,
      highlight: 'inserted',
    };
    updateObject(node.id, {
      height: Math.max(node.height, (entries.length + 1) * 40 + 60),
      data: { ...node.data, entries: [...entries, newEntry] },
    } as any);
  };

  const handleRemove = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    e.preventDefault();
    updateEntries(entries.filter((en) => en.id !== entryId));
  };

  const mutedTextColor = isLight ? '#111111' : '#e2e8f0';

  // Matches ArrayNodeView's theme: an untouched entry is a solid theme-colored
  // cell in dark mode, or plain black-on-white (worksheet style) in light
  // mode; a "found" or custom-colored entry keeps its own color with white
  // text in either theme.
  const isPlainEntry = (entry: HashMapEntry) => isLight && !entry.color && entry.highlight !== 'found';
  const getEntryBg = (entry: HashMapEntry) => {
    if (entry.color) return entry.color;
    if (entry.highlight === 'found') return '#00c853';
    return isLight ? '#ffffff' : primaryColor;
  };
  const getEntryTextColor = (entry: HashMapEntry) => (isPlainEntry(entry) ? '#000000' : '#ffffff');
  // Bold, theme-independent grid lines (like a real spreadsheet/worksheet
  // template) so the divider stays clearly visible regardless of whether the
  // entry behind it is a solid theme-colored fill or a plain white cell.
  const dividerColor = isLight ? '#000000' : 'rgba(255,255,255,0.6)';
  const dividerWidth = 2;

  return (
    <div
      className={`relative flex flex-col select-none transition-all ${
        isSelected ? 'ring-2 ring-white/90 shadow-2xl rounded-2xl' : ''
      }`}
      style={{ width: `${node.width || 200}px` }}
    >
      {/* Floating Add-Entry Button */}
      {isSelected && isInteractive && (
        <button
          type="button"
          onClick={handleAdd}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-20 text-white"
          style={{ backgroundColor: primaryColor }}
          title="Add entry"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Key/Value Grid -- table-style cells sharing borders, like a spreadsheet */}
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          border: `2px solid ${primaryColor}`,
          backgroundColor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.7)',
        }}
      >
        {entries.length === 0 ? (
          <div className="font-sans text-xs italic text-center py-4" style={{ color: `${mutedTextColor}88` }}>
            empty map
          </div>
        ) : (
          entries.map((entry, idx) => (
            <div
              key={entry.id}
              className="relative group flex items-stretch font-sans text-base font-bold"
              style={{
                color: getEntryTextColor(entry),
                backgroundColor: getEntryBg(entry),
                borderTop: idx === 0 ? 'none' : `${dividerWidth}px solid ${dividerColor}`,
              }}
            >
              <div
                className="flex-1 px-2.5 py-1.5 cursor-pointer text-center"
                style={{ borderRight: `${dividerWidth}px solid ${dividerColor}` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInteractive) {
                    setEditingId(entry.id);
                    setEditingField('key');
                  }
                }}
              >
                {editingId === entry.id && editingField === 'key' && isInteractive ? (
                  <input
                    type="text"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    value={formatVal(entry.key)}
                    onChange={(e) =>
                      updateEntries(entries.map((en) => (en.id === entry.id ? { ...en, key: parseVal(e.target.value) } : en)))
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent outline-none font-sans font-bold text-center"
                    style={{ color: getEntryTextColor(entry) }}
                  />
                ) : (
                  formatVal(entry.key)
                )}
              </div>
              <div
                className="flex-1 px-2.5 py-1.5 cursor-pointer text-center"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInteractive) {
                    setEditingId(entry.id);
                    setEditingField('value');
                  }
                }}
              >
                {editingId === entry.id && editingField === 'value' && isInteractive ? (
                  <input
                    type="text"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    value={formatVal(entry.value)}
                    onChange={(e) =>
                      updateEntries(entries.map((en) => (en.id === entry.id ? { ...en, value: parseVal(e.target.value) } : en)))
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent outline-none font-sans font-bold text-center"
                    style={{ color: getEntryTextColor(entry) }}
                  />
                ) : (
                  formatVal(entry.value)
                )}
              </div>

              {isSelected && isInteractive && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, entry.id)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity shadow z-10"
                  title="Remove entry"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* HashMap Name -- below container, centered, matching the Stack node's label */}
      <div className="flex items-center justify-center pt-2 pb-1">
        <span className="font-sans font-bold text-xs tracking-wide" style={{ color: primaryColor }}>
          {name}
        </span>
      </div>
    </div>
  );
};
