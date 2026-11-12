const BASE = import.meta.env.VITE_API_URL || '/api';
const KEY = 'ss_token';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

const qs = (params = {}) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));
  return p.toString() ? `?${p}` : '';
};

const send = (path, { method = 'GET', body, params } = {}) =>
  fetch(BASE + path + qs(params), {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

async function fail(res) {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken()) {
    setToken(null);
    window.dispatchEvent(new Event('ss:logout'));
  }
  const err = new Error(data.message || `Request failed (${res.status})`);
  err.status = res.status;
  err.details = data.details || {};
  throw err;
}

export async function api(path, opts) {
  let res;
  try {
    res = await send(path, opts);
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  if (!res.ok) await fail(res);
  return res.json();
}

// Authenticated file download (CSV exports).
export async function download(path, params, filename) {
  const res = await send(path, { params });
  if (!res.ok) await fail(res);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
export const inputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const today = () => new Date().toISOString().slice(0, 10);
export const monthName = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// Resize an image file to a small square JPEG data-URL so it stays well under the 300KB API limit.
export function imageToDataURL(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = URL.createObjectURL(file);
  });
}
