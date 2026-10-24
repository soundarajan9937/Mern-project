import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'An unexpected error occurred';

    if (error?.response?.status === 401) {
      // Do not auto-redirect if on public pages like /apply-outpass or /visitor-status
      if (
        window.location.pathname.startsWith('/apply-outpass') ||
        window.location.pathname.startsWith('/visitor-registration') ||
        window.location.pathname.startsWith('/visitor-status')
      ) {
        return Promise.reject({ ...error, message });
      }
      // Auto-logout on token expiry
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ ...error, message });
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  registerStudent: (data) => API.post('/auth/register-student', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
};

// ─── Gate Passes ─────────────────────────────────────────────────────────────
export const gatePassAPI = {
  submit: (data) => API.post('/gatepasses', data),
  applyMobile: (data) => API.post('/gatepasses/apply-mobile', data),
  getPublicStatus: (passId) => API.get(`/gatepasses/public-status/${passId}`),
  getMyRequests: () => API.get('/gatepasses/my-requests'),
  getAll: (params) => API.get('/gatepasses', { params: { limit: 100, ...params } }),
  getById: (id) => API.get(`/gatepasses/${id}`),
  updateStatus: (id, data) => API.put(`/gatepasses/${id}/status`, data),
  verifyQR: (data) => API.post('/gatepasses/verify-qr', data),
  recordReturn: (data) => API.post('/gatepasses/record-return', data),
  searchStudent: (query) => API.get('/gatepasses/search-student', { params: { query } }),
  delete: (id) => API.delete(`/gatepasses/${id}`),
};

// ─── Visitors ─────────────────────────────────────────────────────────────────
export const visitorAPI = {
  register: (data) => API.post('/visitors/register', data),
  getMyVisitors: () => API.get('/visitors/my-visitors'),
  getAll: (params) => API.get('/visitors', { params }),
  getById: (id) => API.get(`/visitors/${id}`),
  updateStatus: (id, data) => API.put(`/visitors/${id}/status`, data),
  verifyQR: (data) => API.post('/visitors/verify-qr', data),
  search: (query) => API.get('/visitors/search/records', { params: { query } }),
  delete: (id) => API.delete(`/visitors/${id}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll: (params) => API.get('/notifications', { params }),
  getUnreadCount: (params) => API.get('/notifications/unread-count', { params }),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/mark-all-read'),
};


export default API;
