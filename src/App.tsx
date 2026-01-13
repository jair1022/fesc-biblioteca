import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ReservasPage from './pages/ReservasPage.tsx'
import AdminPage from './pages/AdminPage.tsx'
import MisReservasPage from './pages/MisReservasPage.tsx'

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reservas" element={<ReservasPage />} />
          <Route path="/mis-reservas" element={<MisReservasPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
