import axios from 'axios';

// In dev this hits the Vite proxy / local backend; in prod the sidebar is
// served from the same origin as the backend, so a relative base URL works.
const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? '';

export const apiClient = (token: string | null) =>
  axios.create({
    baseURL: BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
