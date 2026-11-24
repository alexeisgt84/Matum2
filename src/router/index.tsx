import React, { Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import App from '../App';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { useAuthStore } from '../store/authStore';
import { ErrorPage } from '../pages/ErrorPage';
import { LoadingScreen } from '../components/ui/AnimatedLogo';
import { lazyWithRetry } from '../lib/lazyWithRetry';

const LoginPage = lazyWithRetry(() => import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazyWithRetry(() => import('../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazyWithRetry(() =>
  import('../pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const CatalogsPage = lazyWithRetry(() => import('../pages/catalogs/CatalogsPage').then((m) => ({ default: m.CatalogsPage })));
const CatalogFormPage = lazyWithRetry(() =>
  import('../pages/catalogs/CatalogFormPage').then((m) => ({ default: m.CatalogFormPage }))
);
const CatalogDetailPage = lazyWithRetry(() =>
  import('../pages/catalogs/CatalogDetailPage').then((m) => ({ default: m.CatalogDetailPage }))
);
const CatalogTemplatesPage = lazyWithRetry(() =>
  import('../pages/catalogs/CatalogTemplatesPage').then((m) => ({ default: m.CatalogTemplatesPage }))
);
const CatalogSettingsPage = lazyWithRetry(() =>
  import('../pages/settings/CatalogSettingsPage').then((m) => ({ default: m.CatalogSettingsPage }))
);
const FollowedCatalogsPage = lazyWithRetry(() =>
  import('../pages/catalogs/FollowedCatalogsPage').then((m) => ({ default: m.FollowedCatalogsPage }))
);
const ProfilePage = lazyWithRetry(() => import('../pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const EditProfilePage = lazyWithRetry(() =>
  import('../pages/profile/EditProfilePage').then((m) => ({ default: m.EditProfilePage }))
);
const GeminiConfigPage = lazyWithRetry(() =>
  import('../pages/profile/GeminiConfigPage').then((m) => ({ default: m.GeminiConfigPage }))
);
const SubscriptionPage = lazyWithRetry(() =>
  import('../pages/profile/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage }))
);
const AffiliatesPage = lazyWithRetry(() =>
  import('../pages/profile/AffiliatesPage').then((m) => ({ default: m.AffiliatesPage }))
);
const AdminDashboard = lazyWithRetry(() =>
  import('../pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const PlansPage = lazyWithRetry(() => import('../pages/admin/PlansPage').then((m) => ({ default: m.PlansPage })));
const UsersPage = lazyWithRetry(() => import('../pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })));
const PaymentsPage = lazyWithRetry(() => import('../pages/admin/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const AdminSettingsPage = lazyWithRetry(() =>
  import('../pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);
const EvolutionServersPage = lazyWithRetry(() =>
  import('../pages/admin/EvolutionServersPage').then((m) => ({ default: m.EvolutionServersPage }))
);
const ViewsAnalyticsPage = lazyWithRetry(() =>
  import('../pages/admin/ViewsAnalyticsPage').then((m) => ({ default: m.ViewsAnalyticsPage }))
);
const AdminCatalogsPage = lazyWithRetry(() =>
  import('../pages/admin/AdminCatalogsPage').then((m) => ({ default: m.AdminCatalogsPage }))
);
const PublicCatalogPage = lazyWithRetry(() =>
  import('../pages/catalogs/PublicCatalogPage').then((m) => ({ default: m.PublicCatalogPage }))
);
const PublicProductPage = lazyWithRetry(() =>
  import('../pages/catalogs/PublicProductPage').then((m) => ({ default: m.PublicProductPage }))
);
const ShortLinkRedirectPage = lazyWithRetry(() =>
  import('../pages/catalogs/ShortLinkRedirectPage').then((m) => ({ default: m.ShortLinkRedirectPage }))
);

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
);

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loadUser, isInitialized } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) loadUser();
  }, [isInitialized, loadUser]);

  if (!isInitialized) return <LoadingScreen />;

  if (!user) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    const loginPath = target && target !== '/' ? `/login?redirect=${encodeURIComponent(target)}` : '/login';
    return <Navigate to={loginPath} replace />;
  }
  return <LazyRoute>{children}</LazyRoute>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isInitialized } = useAuthStore();
  
  if (!isInitialized) return <LoadingScreen />;
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <LazyRoute>{children}</LazyRoute>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: 'login', element: <LazyRoute><LoginPage /></LazyRoute> },
      { path: 'register', element: <LazyRoute><RegisterPage /></LazyRoute> },
      { path: 'forgot-password', element: <LazyRoute><ForgotPasswordPage /></LazyRoute> },
      {
        path: '',
        element: <DashboardPage />,
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
        path: 'catalogs/:catalogId/settings',
        element: <PrivateRoute><CatalogSettingsPage /></PrivateRoute>,
      },
      {
        path: 'followed-catalogs',
        element: <PrivateRoute><FollowedCatalogsPage /></PrivateRoute>,
      },
      {
        path: 'profile',
        element: <PrivateRoute><ProfilePage /></PrivateRoute>,
      },
      {
        path: 'profile/edit',
        element: <PrivateRoute><EditProfilePage /></PrivateRoute>,
      },
      {
        path: 'profile/affiliates',
        element: <PrivateRoute><AffiliatesPage /></PrivateRoute>,
      },
      {
        path: 'profile/ai-settings',
        element: <PrivateRoute><GeminiConfigPage /></PrivateRoute>,
      },
      {
        path: 'profile/subscription',
        element: <PrivateRoute><SubscriptionPage /></PrivateRoute>,
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
      {
        path: 'admin/payments',
        element: <AdminRoute><PaymentsPage /></AdminRoute>,
      },
      {
        path: 'admin/settings',
        element: <AdminRoute><AdminSettingsPage /></AdminRoute>,
      },
      {
        path: 'admin/servers',
        element: <AdminRoute><EvolutionServersPage /></AdminRoute>,
      },
      {
        path: 'admin/views',
        element: <AdminRoute><ViewsAnalyticsPage /></AdminRoute>,
      },
      {
        path: 'admin/catalogs',
        element: <AdminRoute><AdminCatalogsPage /></AdminRoute>,
      },
      {
        path: 's/:code',
        element: <LazyRoute><ShortLinkRedirectPage /></LazyRoute>,
      },
      {
        path: ':slug/p/:productId',
        element: <LazyRoute><PublicProductPage /></LazyRoute>,
      },
      {
        path: ':slug/producto/:productId',
        element: <LazyRoute><PublicProductPage /></LazyRoute>,
      },
      {
        path: ':slug',
        element: <LazyRoute><PublicCatalogPage /></LazyRoute>,
      },
    ],
  },
]);
