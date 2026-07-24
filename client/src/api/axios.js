import axios from 'axios';

// In Capacitor APK there is no Vite proxy — use the absolute production URL.
// In dev/web the relative '/api' is proxied by Vite to localhost:5000.
const BASE = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE}/api`
  : '/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
