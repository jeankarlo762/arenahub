import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from './store/auth.store'
import * as authApi from './api/auth.api'

import LoginPage from './pages/Login'
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInit() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!accessToken || user) return
    authApi.getMe()
      .then((u) => useAuthStore.getState().setUser(u))
      .catch((err) => {
        if (err?.response?.status === 401) {
          useAuthStore.getState().clearAuth()
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px' },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/courts"
          element={
            <RequireAuth>
              <CourtsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequireAuth>
              <BookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/tournaments"
          element={
            <RequireAuth>
              <TournamentsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/tournaments/:id"
          element={
            <RequireAuth>
              <TournamentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/tournaments/:id/tv"
          element={
            <RequireAuth>
              <TournamentTVPage />
            </RequireAuth>
          }
        />
        <Route
          path="/tournaments/:id/bracket"
          element={
            <RequireAuth>
              <TournamentBracketPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bar"
          element={
            <RequireAuth>
              <BarPage />
            </RequireAuth>
          }
        />
        <Route
          path="/comandas"
          element={
            <RequireAuth>
              <ComandasPage />
            </RequireAuth>
          }
        />
        <Route path="/clients" element={<RequireAuth><ClientsPage /></RequireAuth>} />
        <Route path="/rentals" element={<RequireAuth><RentalsPage /></RequireAuth>} />
        <Route
          path="/financial"
          element={
            <RequireAuth>
              <FinancialPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
