import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GlobalLoader } from './components/GlobalLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorAlert } from './components/ErrorAlert';
import { AuthGuard } from './components/guards/AuthGuard';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { UsersServerPage } from './pages/UsersServerPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingDemoPage } from './pages/LoadingDemoPage';
import { ErrorDemoPage } from './pages/ErrorDemoPage';
import { ThemeSettingsPage } from './pages/ThemeSettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { setLoadingCallback } from './api/client';
import { useLoading } from './contexts/LoadingContext';

const LoadingBridge = () => {
  const { setLoading } = useLoading();
  useEffect(() => {
    setLoadingCallback(setLoading);
  }, [setLoading]);
  return null;
};

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <LoadingBridge />
              <GlobalLoader message="Загрузка..." />
              <ErrorAlert />
              <Header />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/loading-demo" element={<LoadingDemoPage />} />
                <Route path="/error-demo" element={<ErrorDemoPage />} />
                <Route path="/theme-settings" element={<ThemeSettingsPage />} />

                <Route path="/users" element={
                  <AuthGuard>
                    <UsersPage />
                  </AuthGuard>
                } />
                <Route path="/users-server" element={
                  <AuthGuard>
                    <UsersServerPage />
                  </AuthGuard>
                } />
                <Route path="/profile/:id" element={
                  <AuthGuard>
                    <ProfilePage />
                  </AuthGuard>
                } />
                <Route path="/profile/:id/edit" element={
                  <AuthGuard>
                    <EditProfilePage />
                  </AuthGuard>
                } />

                <Route path="/404" element={<NotFoundPage />} />
                <Route path="/500" element={<ServerErrorPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
