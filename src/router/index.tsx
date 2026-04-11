import React, { useEffect } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { CatalogsPage } from '../pages/catalogs/CatalogsPage';
import { CatalogFormPage } from '../pages/catalogs/CatalogFormPage';
import { CatalogDetailPage } from '../pages/catalogs/CatalogDetailPage';
import { HistoryPage } from '../pages/history/HistoryPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { useAuthStore } from '../store/authStore';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loadUser, isInitialized } = useAuthStore();
  
  useEffect(() => {
    if (!isInitialized) loadUser();
  }, [isInitialized, loadUser]);

  if (!isInitialized) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      {
        path: '',
        element: <PrivateRoute><DashboardPage /></PrivateRoute>,
      },
      {
        path: 'catalogs',
        element: <PrivateRoute><CatalogsPage /></PrivateRoute>,
      },
      {
        path: 'catalogs/new',
        element: <PrivateRoute><CatalogFormPage /></PrivateRoute>,
      },
      {
        path: 'catalogs/:catalogId',
        element: <PrivateRoute><CatalogDetailPage /></PrivateRoute>,
      },
      {
        path: 'catalogs/:catalogId/edit',
        element: <PrivateRoute><CatalogFormPage /></PrivateRoute>,
      },
      {
        path: 'history',
        element: <PrivateRoute><HistoryPage /></PrivateRoute>,
      },
      {
        path: 'profile',
        element: <PrivateRoute><ProfilePage /></PrivateRoute>,
      },
    ],
  },
]);
