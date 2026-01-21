import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ReservasPage from './pages/ReservasPage.tsx'
import ReservaConfirmacionPage from './pages/ReservaConfirmacionPage.tsx'
import AdminPage from './pages/AdminPage.tsx'
import MisReservasPage from './pages/MisReservasPage.tsx'
import RequireAuth from './components/Auth/RequireAuth'

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/reservas"
            element={
              <RequireAuth>
                <ReservasPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reservas/confirmacion"
            element={
              <RequireAuth>
                <ReservaConfirmacionPage />
              </RequireAuth>
            }
          />
          <Route path="/mis-reservas" element={<MisReservasPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminPage />
              </RequireAuth>
            }
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
