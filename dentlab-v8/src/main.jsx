import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './contexts/AppContext';
import App from './App';
import OfflineIndicator from './components/OfflineIndicator';
import './styles.css';

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW not available in dev — silently ignore
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
      <OfflineIndicator />
    </AppProvider>
  </StrictMode>
);
