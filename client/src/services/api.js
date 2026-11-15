import axios from 'axios';

/** Every request goes to /api/v1 on the same origin (Vite proxies it to the server during development). */
const API = axios.create({ baseURL: '/api/v1', timeout: 20_000 });

const TOKEN_KEY = 'token';
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

API.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Calls `onUnauthorized` when an authenticated request is rejected with 401. */
export function installAuthInterceptor(onUnauthorized) {
  return API.interceptors.response.use(undefined, (error) => {
    const isLoginOrRegister = /^\/auth\/(login|register)/.test(error.config?.url ?? '');
    if (error.response?.status === 401 && !isLoginOrRegister && tokenStorage.get()) onUnauthorized();
    return Promise.reject(error);
  });
}

/** A message that is safe and useful to show the user for any failed request. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (data && typeof data === 'object' && data.message) return data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (!error?.response && error?.request) return 'Cannot reach the server. Check that it is running.';
  if (error?.response?.status >= 500) return 'The server could not complete the request. Check that it is running.';
  return error?.message || fallback;
}

export default API;
