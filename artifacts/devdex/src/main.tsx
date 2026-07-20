import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// On GitHub Pages (and any static host) there is no API server on the same
// origin, so requests must be pointed at wherever the API is deployed.
// Set VITE_API_URL at build time, e.g.:
//   VITE_API_URL=https://your-api.example.com pnpm --filter @workspace/devdex run build
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById('root')!).render(<App />);
