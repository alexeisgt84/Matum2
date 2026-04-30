import React, { useEffect } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { CatalogsPage } from '../pages/catalogs/CatalogsPage';
import { CatalogFormPage } from '../pages/catalogs/CatalogFormPage';
import { CatalogDetailPage } from '../pages/catalogs/CatalogDetailPage';
import { CatalogTemplatesPage } from '../pages/catalogs/CatalogTemplatesPage';
import { HistoryPage } from '../pages/history/HistoryPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { PlansPage } from '../pages/admin/PlansPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { useAuthStore } from '../store/authStore';
import { ErrorPage } from '../pages/ErrorPage';


const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loadUser, isInitialized } = useAuthStore();
  
  useEffect(() => {
    if (!isInitialized) loadUser();
  }, [isInitialized, loadUser]);

  if (!isInitialized) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isInitialized } = useAuthStore();
  
  if (!isInitialized) return null;
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
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
        path: 'catalogs/:catalogId/templates',
        element: <PrivateRoute><CatalogTemplatesPage /></PrivateRoute>,
      },
      {
        path: 'history',
        element: <PrivateRoute><HistoryPage /></PrivateRoute>,
      },
      {
        path: 'profile',
        element: <PrivateRoute><ProfilePage /></PrivateRoute>,
      },
      {
        path: 'admin',
        element: <AdminRoute><AdminDashboard /></AdminRoute>,
      },
      {
        path: 'admin/plans',
        element: <AdminRoute><PlansPage /></AdminRoute>,
      },
      {
        path: 'admin/users',
        element: <AdminRoute><UsersPage /></AdminRoute>,
      },
    ],
  },
]);
