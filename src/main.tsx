import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );

    // Fade out and remove the standalone splash loader once React renders
    requestAnimationFrame(() => {
      const loader = document.getElementById('medikiosk-initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
          loader.remove();
        }, 300);
      }
    });
  } catch (mountErr) {
    console.error('[MediKiosk Mount Error]', mountErr);
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#C9C5AF;font-family:sans-serif;padding:20px;">
        <div style="background:#E3DDCA;border:1px solid #A9AA94;border-radius:10px;padding:24px;max-width:480px;text-align:center;">
          <h2 style="color:#26312B;margin-top:0;">MediKiosk Startup Notice</h2>
          <p style="color:#596058;font-size:14px;">An issue occurred while mounting the clinical kiosk interface.</p>
          <button onclick="location.reload()" style="background:#29483C;color:#F0EBDD;border:none;padding:10px 18px;border-radius:6px;font-weight:600;cursor:pointer;">
            Restart Terminal
          </button>
        </div>
      </div>
    `;
  }
} else {
  console.error('[MediKiosk] Root element #root was not found in the DOM.');
}
