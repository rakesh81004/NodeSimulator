import { useThemeStore } from '../store/themeStore';

export const useTheme = () => {
  const themeColor = useThemeStore((state) => state.themeColor);
  
  return {
    themeColor,
    // Black separator color as requested
    separatorColor: '#000000',
    // Get theme with opacity for overlays
    themeWithOpacity: (opacity: number) => {
      const hex = themeColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
  };
};

// Preset theme colors
export const themePresets = [
  { label: 'Blue', color: '#007aff' },
  { label: 'Green', color: '#00c853' },
  { label: 'Yellow', color: '#ffd600' },
  { label: 'Purple', color: '#8b5cf6' },
  { label: 'Red', color: '#f43f5e' },
  { label: 'Orange', color: '#ff9800' },
  { label: 'Pink', color: '#ec4899' },
  { label: 'Teal', color: '#14b8a6' },
];