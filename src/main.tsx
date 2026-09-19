import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ApiProvider } from './api/context';
import { BrandingProvider } from './branding/BrandingProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { SessionProvider } from './session/SessionContext';
import { TokenExpiryProvider } from './session/TokenExpiryContext';
import { TokenExpiredModal } from './components/TokenExpiredModal';
import './styles/global.css';
import './components/ui.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrandingProvider>
        <ApiProvider>
          <TokenExpiryProvider>
            <SessionProvider>
              <BrowserRouter>
                <App />
                <TokenExpiredModal />
              </BrowserRouter>
            </SessionProvider>
          </TokenExpiryProvider>
        </ApiProvider>
      </BrandingProvider>
    </ThemeProvider>
  </StrictMode>,
);
