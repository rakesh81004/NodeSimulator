import { SimulationData, SimulationSummary, UserProfile } from '../types/simulation';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('dsa_animator_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An error occurred with the server.';
    try {
      const errorJson = await res.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async register(email: string, name: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    return handleResponse(res);
  },

  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Simulations
  async listSimulations(search?: string, tag?: string): Promise<{ simulations: SimulationSummary[] }> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tag) params.set('tag', tag);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/simulations${qs}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getSimulation(id: string): Promise<{ simulation: SimulationData }> {
    const res = await fetch(`${API_BASE}/simulations/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createSimulation(name: string, description?: string, templateId?: string): Promise<{ simulation: SimulationData }> {
    const res = await fetch(`${API_BASE}/simulations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description, templateId }),
    });
    return handleResponse(res);
  },

  async updateSimulation(id: string, data: SimulationData, name?: string, description?: string): Promise<{ simulation: SimulationData }> {
    const res = await fetch(`${API_BASE}/simulations/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ data, name, description }),
    });
    return handleResponse(res);
  },

  async deleteSimulation(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/simulations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async duplicateSimulation(id: string): Promise<{ simulation: SimulationData }> {
    const res = await fetch(`${API_BASE}/simulations/${id}/duplicate`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async importSimulation(jsonData: any): Promise<{ simulation: SimulationData }> {
    const res = await fetch(`${API_BASE}/simulations/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(jsonData),
    });
    return handleResponse(res);
  },

  async getTemplates(): Promise<{ templates: Array<{ id: string; name: string; description: string; stepCount: number }> }> {
    const res = await fetch(`${API_BASE}/simulations/templates`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};
