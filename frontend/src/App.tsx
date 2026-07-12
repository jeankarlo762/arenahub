import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { PrivacyBanner } from './components/ui/PrivacyBanner'
import { useAuthStore } from './store/auth.store'
import { useBrandingStore, applyBrandingCss } from './store/branding.store'
import * as authApi from './api/auth.api'
import * as settingsApi from './api/settings.api'

import LoginPage from './pages/Login'
import SuperAdminLoginPage from './pages/SuperAdmin/Login'
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard'
import TenantsPage from './pages/SuperAdmin'
import TenantUsersPage from './pages/SuperAdmin/TenantUsers'
import FinanceiroPage from './pages/SuperAdmin/Financeiro'
import SegurancaPage from './pages/SuperAdmin/Seguranca'
import SuperAdminAuditoria from './pages/SuperAdmin/Auditoria'
import SuportePage from './pages/SuperAdmin/Suporte'
import SuperAdminEmailPage from './pages/SuperAdmin/Email'
import DashboardPage from './pages/Dashboard'
import CourtsPage from './pages/Courts'
import BookingsPage from './pages/Bookings'
import TournamentsPage from './pages/Tournaments'
import TournamentPage from './pages/Tournaments/TournamentPage'
import TournamentTVPage from './pages/Tournaments/TournamentTV'
import TournamentBracketPage from './pages/Tournaments/TournamentBracket'
import BarPage from './pages/Bar'
import ComandasPage from './pages/Comandas'
import FinancialPage from './pages/Financial'
import SettingsPage from './pages/Settings'
import ClientsPage from './pages/Clients'
import RentalsPage from './pages/Rentals'
import ReportsPage from './pages/Reports'
import AutoBookingPage from './pages/AutoBooking'
import AuditPage from './pages/Audit'
import SuporteUserPage from './pages/Suporte'
import AccountPage from './pages/Account'
import PublicBookingPage from './pages/PublicBooking'
import ConfirmPresencePage from './pages/ConfirmPresence'
import PrivacidadePage from './pages/Privacidade'
import TermosPage from './pages/Termos'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'SUPERADMIN') return <Navigate to="/superadmin" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'SUPERADMIN') return <Navigate to="/superadmin" replace />
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/superadmin/login" replace />
  if (user?.role !== 'SUPERADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppInit() {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) return
    authApi.getMe()
      .then((u) => useAuthStore.getState().setUser(u))
      .catch((err) => {
        if (err?.response?.status === 401) {
          useAuthStore.getState().clearAuth()
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Load tenant branding (color/logo/name) once authenticated and apply globally.
  useEffect(() => {
    if (!accessToken || useAuthStore.getState().user?.role === 'SUPERADMIN') return
    settingsApi.getBranding()
      .then((b) => {
        useBrandingStore.getState().setBranding(b)
        applyBrandingCss(b.primaryColor)
      })
      .catch(() => {})
      .finally(() => useBrandingStore.getState().setLoaded())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <PrivacyBanner />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px' },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
        <Route path="/superadmin" element={<RequireSuperAdmin><SuperAdminDashboard /></RequireSuperAdmin>} />
        <Route path="/superadmin/tenants" element={<RequireSuperAdmin><TenantsPage /></RequireSuperAdmin>} />
        <Route path="/superadmin/usuarios" element={<RequireSuperAdmin><TenantUsersPage /></RequireSuperAdmin>} />
        <Route path="/superadmin/financeiro" element={<RequireSuperAdmin><FinanceiroPage /></RequireSuperAdmin>} />
        <Route path="/superadmin/auditoria" element={<RequireSuperAdmin><SuperAdminAuditoria /></RequireSuperAdmin>} />
        <Route path="/superadmin/seguranca" element={<RequireSuperAdmin><SegurancaPage /></RequireSuperAdmin>} />
        <Route path="/superadmin/email" element={<RequireSuperAdmin><SuperAdminEmailPage /></RequireSuperAdmin>} />
        <Route path="/superadmin/suporte" element={<RequireSuperAdmin><SuportePage /></RequireSuperAdmin>} />
        <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/courts" element={<RequireAuth><CourtsPage /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth><BookingsPage /></RequireAuth>} />
        <Route path="/tournaments" element={<RequireAuth><TournamentsPage /></RequireAuth>} />
        <Route path="/tournaments/:id" element={<RequireAuth><TournamentPage /></RequireAuth>} />
        <Route path="/tournaments/:id/tv" element={<RequireAuth><TournamentTVPage /></RequireAuth>} />
        <Route path="/tournaments/:id/bracket" element={<RequireAuth><TournamentBracketPage /></RequireAuth>} />
        <Route path="/clients" element={<RequireAuth><ClientsPage /></RequireAuth>} />
        <Route path="/rentals" element={<RequireAuth><RentalsPage /></RequireAuth>} />
        {/* Admin-only routes */}
        <Route path="/bar" element={<RequireAdmin><BarPage /></RequireAdmin>} />
        <Route path="/comandas" element={<RequireAuth><ComandasPage /></RequireAuth>} />
        <Route path="/financial" element={<RequireAdmin><FinancialPage /></RequireAdmin>} />
        <Route path="/settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
        <Route path="/reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
        <Route path="/auto-booking" element={<RequireAdmin><AutoBookingPage /></RequireAdmin>} />
        <Route path="/audit" element={<RequireAdmin><AuditPage /></RequireAdmin>} />
        <Route path="/suporte" element={<RequireAuth><SuporteUserPage /></RequireAuth>} />
        <Route path="/minha-conta" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/booking/:slug" element={<PublicBookingPage />} />
        <Route path="/confirmar/:id" element={<ConfirmPresencePage />} />
        <Route path="/privacidade" element={<PrivacidadePage />} />
        <Route path="/termos" element={<TermosPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
