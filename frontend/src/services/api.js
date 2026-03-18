import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injeta o token JWT automaticamente
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('ominsounds-auth');
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (_) {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de resposta: logout automático em 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado — limpa o estado local
      const authData = localStorage.getItem('ominsounds-auth');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed?.state?.token) {
            // Força logout via Zustand seria ideal, mas aqui apenas limpamos
            localStorage.removeItem('ominsounds-auth');
            window.location.href = '/login';
          }
        } catch (_) {}
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Users / Perfil ──────────────────────────────────────────────────────────
export const usersAPI = {
  /** Atualiza dados do perfil (nome, bio, CPF, telefone, avatar URL) */
  updateProfile: (data) => api.put('/users/profile', data),

  /** Upload de imagem de avatar — retorna { avatar_url } */
  uploadAvatar: (formData) =>
    api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── Beats ───────────────────────────────────────────────────────────────────
export const beatsAPI = {
  getAll: (params) => api.get('/beats', { params }),
  getById: (id) => api.get(`/beats/${id}`),
  create: (formData) =>
    api.post('/beats', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, data) => api.put(`/beats/${id}`, data),
  delete: (id) => api.delete(`/beats/${id}`),
};

// ─── Producers ───────────────────────────────────────────────────────────────
export const producersAPI = {
  getProfile: (id) => api.get(`/producers/${id}`),
  getStats: () => api.get('/producer/stats'),
  getBeats: () => api.get('/producer/beats'),
};

// ─── Favorites ───────────────────────────────────────────────────────────────
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (beatId) => api.post(`/favorites/${beatId}`),
  remove: (beatId) => api.delete(`/favorites/${beatId}`),
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  download: (orderId, beatId) =>
    api.get(`/orders/${orderId}/download/${beatId}`),
};

export default api;
