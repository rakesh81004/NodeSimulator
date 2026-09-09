import React from 'react';
import { useThemeStore } from '../../store/themeStore';
import { themePresets } from '../../utils/themeConfig';
import { Palette } from 'lucide-react';

interface Props {
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const ThemePicker: React.FC<Props> = ({ position = 'bottom' }) => {
  const { themeColor, setThemeColor } = useThemeStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2';
      case 'bottom':
        return 'top-full mt-2 right-0';
      case 'left':
        return 'right-full mr-2';
      case 'right':
        return 'left-full ml-2';
      default:
        return 'top-full mt-2';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
        title="Change theme color"
      >
        <Palette className="w-4 h-4" />
        <span className="text-xs font-mono">Theme</span>
        <div
          className="w-4 h-4 rounded-full border-2 border-white/60"
          style={{ backgroundColor: themeColor }}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute z-50 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl ${getPositionClasses()} min-w-[200px]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-mono text-slate-400 mb-2">Select Theme Color</div>
            <div className="grid grid-cols-4 gap-2">
              {themePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setThemeColor(preset.color);
                    setIsOpen(false);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    themeColor === preset.color
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-white/60 hover:border-white'
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.label}
                />
              ))}
            </div>
            
            {/* Custom color input */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <label className="text-[11px] text-slate-400 block mb-1">Custom Color</label>
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};