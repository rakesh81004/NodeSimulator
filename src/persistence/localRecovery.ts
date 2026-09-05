import { SimulationData } from '../types/simulation';

const RECOVERY_KEY_PREFIX = 'dsa_animator_recovery_';

export const localRecovery = {
  saveDraft(simulation: SimulationData) {
    try {
      localStorage.setItem(`${RECOVERY_KEY_PREFIX}${simulation.id}`, JSON.stringify({
        timestamp: Date.now(),
        data: simulation,
      }));
    } catch (e) {
      console.warn('[Recovery] Local cache storage full or disabled', e);
    }
  },

  getDraft(simulationId: string): { timestamp: number; data: SimulationData } | null {
    try {
      const raw = localStorage.getItem(`${RECOVERY_KEY_PREFIX}${simulationId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearDraft(simulationId: string) {
    try {
      localStorage.removeItem(`${RECOVERY_KEY_PREFIX}${simulationId}`);
    } catch {
      // ignore
    }
  },
};
