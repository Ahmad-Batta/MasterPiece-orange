import axios from 'axios';
import i18n from '../i18n';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  config.headers.Accept = 'application/json';
  config.headers['Accept-Language'] = i18n.language || 'en';
  const token = window.localStorage.getItem('careerhub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401) {
      window.localStorage.removeItem('careerhub_token');
      window.localStorage.removeItem('careerhub_role');
      window.localStorage.removeItem('careerhub_user');
      window.dispatchEvent(new CustomEvent('careerhub:auth-expired'));
    }

    if (status === 402 && payload?.code === 'AI_QUOTA_EXCEEDED') {
      window.dispatchEvent(new CustomEvent('careerhub:quota-exceeded', {
        detail: { plans: payload.errors?.upgrade_plans || [] },
      }));
    }

    return Promise.reject(error);
  },
);

export default api;
