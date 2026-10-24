
import axios from 'axios';

// Backend URL: use env variable, or fallback to current origin (when served by backend)
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

// Axios instance connected to the deployed backend
const API = axios.create({
  baseURL: `${API_BASE_URL ? API_BASE_URL.replace(/\/+$/, '') : ''}/api`,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'An unexpected error occurred';

    if (error?.response?.status === 401) {
      // Keep public pages accessible without automatic logout
      const publicPaths = [
        '/apply-outpass',
        '/visitor-registration',
        '/visitor-status',
      ];

      const isPublicPage = publicPaths.some((path) =>
        window.location.pathname.startsWith(path)
      );

      if (isPublicPage) {
        return Promise.reject({ ...error, message });
      }

      // Clear expired or invalid login information
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ ...error, message });
  }
);

// ─── Authentication ───────────────────────────────────────────────
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  registerStudent: (data) => API.post('/auth/register-student', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
};

// ─── Student Gate Passes ──────────────────────────────────────────
export const gatePassAPI = {
  submit: (data) => API.post('/gatepasses', data),
  applyMobile: (data) => API.post('/gatepasses/apply-mobile', data),
  getPublicStatus: (passId) =>
    API.get(`/gatepasses/public-status/${passId}`),
  getMyRequests: () => API.get('/gatepasses/my-requests'),
  getAll: (params) =>
    API.get('/gatepasses', {
      params: { limit: 100, ...params },
    }),
  getById: (id) => API.get(`/gatepasses/${id}`),
  updateStatus: (id, data) =>
    API.put(`/gatepasses/${id}/status`, data),
  verifyQR: (data) => API.post('/gatepasses/verify-qr', data),
  recordReturn: (data) => API.post('/gatepasses/record-return', data),
  searchStudent: (query) =>
    API.get('/gatepasses/search-student', {
      params: { query },
    }),
  getNetworkInfo: () => API.get('/gatepasses/network-info'),
  delete: (id) => API.delete(`/gatepasses/${id}`),
};

// ─── Visitors ─────────────────────────────────────────────────────
export const visitorAPI = {
  register: (data) => API.post('/visitors/register', data),
  getMyVisitors: () => API.get('/visitors/my-visitors'),
  getAll: (params) => API.get('/visitors', { params }),
  getById: (id) => API.get(`/visitors/${id}`),
  updateStatus: (id, data) =>
    API.put(`/visitors/${id}/status`, data),
  verifyQR: (data) => API.post('/visitors/verify-qr', data),
  search: (query) =>
    API.get('/visitors/search/records', {
      params: { query },
    }),
  delete: (id) => API.delete(`/visitors/${id}`),
};

// ─── Notifications ────────────────────────────────────────────────
export const notificationAPI = {
  getAll: (params) => API.get('/notifications', { params }),
  getUnreadCount: (params) =>
    API.get('/notifications/unread-count', { params }),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/mark-all-read'),
};

export default API;
