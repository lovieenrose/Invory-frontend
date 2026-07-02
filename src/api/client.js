import axios from 'axios';
import { supabase } from './supabaseClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 20000,
});

// Attach the current Supabase access token to every outgoing request.
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors so callers can just read `err.message` / `err.details`.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const payload = error.response?.data;
    const normalized = new Error(payload?.message || error.message || 'Something went wrong');
    normalized.details = payload?.details;
    normalized.statusCode = error.response?.status;

    if (error.response?.status === 401) {
      // Session expired/invalid — force a clean re-login rather than
      // leaving the UI in a half-authenticated state.
      supabase.auth.signOut();
    }

    return Promise.reject(normalized);
  },
);

export default api;
