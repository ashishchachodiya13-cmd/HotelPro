import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const api = axios.create({ baseURL: API_URL, withCredentials: true }); // JWT travels in an HttpOnly cookie

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Session expired / revoked on a protected call: let AuthContext clear state and redirect.
    if (err.response?.status === 401 && !err.config?.url?.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export const getErrorMessage = (err) =>
  err.response?.data?.message ||
  (err.request ? 'Cannot reach the server. Check that the API is running.' : err.message || 'Something went wrong.');

export const getFieldErrors = (err) => err.response?.data?.errors || {};

export default api;
