import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { ChatProvider } from './context/ChatContext';
import { CanvasProvider } from './context/CanvasContext';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const ResearchApp = lazy(() => import('./research/ResearchApp'));
const App = lazy(() => import('./App'));
const Settings = lazy(() => import('./pages/Settings'));
const PopupPage = lazy(() => import('./pages/PopupPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-background text-muted-foreground">
    <div className="flex flex-col items-center gap-3">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono tracking-wider opacity-70">NEOCHAT</span>
    </div>
  </div>
);

const router = createHashRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <App />
      </Suspense>
    ),
  },
  {
    path: '/settings',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Settings />
      </Suspense>
    ),
  },
  {
    path: '/popup',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PopupPage />
      </Suspense>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {window.research ? <Suspense fallback={<PageLoader />}><ResearchApp /></Suspense> : <LanguageProvider>
        <ThemeProvider>
          <ProjectProvider>
            <ChatProvider>
              <CanvasProvider>
                <RouterProvider router={router} />
              </CanvasProvider>
            </ChatProvider>
          </ProjectProvider>
        </ThemeProvider>
      </LanguageProvider>}
    </ErrorBoundary>
  </React.StrictMode>
);
