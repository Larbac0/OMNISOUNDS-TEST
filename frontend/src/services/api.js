import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('ominsounds-auth');
    if (authData) {
      const { token } = JSON.parse(authData).state;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Users
export const usersAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
};

// Beats
export const beatsAPI = {
  getAll: (params) => api.get('/beats', { params }),
  getById: (id) => api.get(`/beats/${id}`),
  create: (formData) => api.post('/beats', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/beats/${id}`, data),
  delete: (id) => api.delete(`/beats/${id}`),
};

// Producers
export const producersAPI = {
  getProfile: (id) => api.get(`/producers/${id}`),
  getStats: () => api.get('/producer/stats'),
  getBeats: () => api.get('/producer/beats'),
};

// Favorites
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (beatId) => api.post(`/favorites/${beatId}`),
  remove: (beatId) => api.delete(`/favorites/${beatId}`),
};

// Orders
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
};

export default api;
