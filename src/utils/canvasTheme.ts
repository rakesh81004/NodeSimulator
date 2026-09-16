import { useSimulationStore } from '../store/simulationStore';

// Light mode renders the diagram in a clean "worksheet" style (white
// background, orange-bordered cells, plain black text/arrows) matching
// textbook/course-slide diagrams, instead of the default dark canvas.
export function useIsLightTheme(): boolean {
  return useSimulationStore((s) => s.simulation?.settings?.theme === 'light');
}

export const LIGHT_ACCENT = '#f97316';
export const LIGHT_TEXT = '#111111';
