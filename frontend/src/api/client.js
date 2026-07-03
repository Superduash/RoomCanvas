import axios from 'axios';

// Resolve VITE_API_BASE from env or fallback to '/api'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds timeout
});

export default client;

export const resolveImageUrl = (path) => {
  if (!path) return '';
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
  const serverBase = apiBase.replace('/api', '');
  
  // Normalize slashes and remove folder prefixes to map to the static mount
  let cleanPath = path.replace(/\\/g, '/');
  if (cleanPath.startsWith('backend/storage/')) {
    cleanPath = cleanPath.substring('backend/storage/'.length);
  } else if (cleanPath.startsWith('storage/')) {
    cleanPath = cleanPath.substring('storage/'.length);
  } else if (cleanPath.startsWith('./storage/')) {
    cleanPath = cleanPath.substring('./storage/'.length);
  }
  
  return `${serverBase}/static/${cleanPath}`;
};
