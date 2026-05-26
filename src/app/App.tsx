import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { AuthProvider } from "../features/auth/AuthProvider";
import { useAuth } from "../features/auth/auth-context";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { PendingPage } from "../features/auth/PendingPage";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { AdminPage } from "../features/admin/AdminPage";
import { DashboardPage, ProfilePage } from "../features/profile/ProfilePage";
import { KioskPage, QRScannerPage } from "../features/qr/QRPages";

export function App() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/pendiente" element={<PendingPage />} />
        <Route path="/kiosko" element={<KioskPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage dark={dark} onToggleTheme={() => setDark((value) => !value)} />} />
          <Route path="/perfil" element={<ProfilePage dark={dark} onToggleTheme={() => setDark((value) => !value)} />} />
          <Route path="/qr" element={<AuthorizedRoute><QRScannerPage dark={dark} onToggleTheme={() => setDark((value) => !value)} /></AuthorizedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage dark={dark} onToggleTheme={() => setDark((value) => !value)} /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.password_change_required && location.pathname !== "/cambiar-contrasena") return <Navigate to="/cambiar-contrasena" replace />;
  if (!user.password_change_required && location.pathname === "/cambiar-contrasena") return <Navigate to="/dashboard" replace />;
  if (user.authorization_status === "pending" && user.role !== "admin" && location.pathname !== "/perfil") return <Navigate to="/pendiente" replace />;
  return <Outlet />;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.password_change_required) return <Navigate to="/cambiar-contrasena" replace />;
  if (user.role === "admin" && user.authorization_status === "authorized") return <Navigate to="/admin" replace />;
  if (user.authorization_status === "pending") return <Navigate to="/pendiente" replace />;
  if (user.is_authorized) return <Navigate to="/qr" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.password_change_required) return <Navigate to="/cambiar-contrasena" replace />;
  return user?.role === "admin" && user.authorization_status === "authorized" ? children : <Navigate to="/dashboard" replace />;
}

function AuthorizedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.password_change_required) return <Navigate to="/cambiar-contrasena" replace />;
  return user?.is_authorized || (user?.role === "admin" && user.authorization_status === "authorized") ? children : <Navigate to="/dashboard" replace />;
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">Cargando sesion...</div>
    </main>
  );
}
