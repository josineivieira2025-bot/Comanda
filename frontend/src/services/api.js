const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const buttonRequests = new WeakMap();
let activeRequests = 0;

export const getToken = () => localStorage.getItem('orbe.token');
export const setToken = token => token ? localStorage.setItem('orbe.token', token) : localStorage.removeItem('orbe.token');

function beginRequest() {
  activeRequests += 1;
  document.body.classList.add('api-busy');
  const active = document.activeElement;
  const button = active?.matches?.('button') ? active : active?.closest?.('button');
  if (button) {
    buttonRequests.set(button, (buttonRequests.get(button) || 0) + 1);
    button.dataset.loading = 'true';
    button.setAttribute('aria-busy', 'true');
  }
  return button;
}

function endRequest(button) {
  activeRequests = Math.max(0, activeRequests - 1);
  if (!activeRequests) document.body.classList.remove('api-busy');
  if (!button) return;
  const remaining = Math.max(0, (buttonRequests.get(button) || 1) - 1);
  if (remaining) buttonRequests.set(button, remaining);
  else {
    buttonRequests.delete(button);
    delete button.dataset.loading;
    button.removeAttribute('aria-busy');
  }
}

export async function api(path, options = {}) {
  const button = beginRequest();
  try {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${BASE}${path}`, { ...options, headers, body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) setToken(null);
      const message = data.message || 'Falha na comunicação com a API';
      window.dispatchEvent(new CustomEvent('orbe:api-error', { detail: message }));
      throw new Error(message);
    }
    return data;
  } finally {
    endRequest(button);
  }
}

export const publicApi = (path, options = {}) => api(`/public${path}`, options);
