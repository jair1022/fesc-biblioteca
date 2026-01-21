import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const getStoredEmail = () => {
  try {
    const raw = localStorage.getItem('fesc-user')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { email?: string }
    return parsed.email || ''
  } catch {
    return ''
  }
}

const getStoredRole = () => {
  try {
    const raw = localStorage.getItem('fesc-user')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { role?: string }
    return parsed.role || ''
  } catch {
    return ''
  }
}

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAuthed, setIsAuthed] = useState(() => Boolean(localStorage.getItem('fesc-token')))
  const [userEmail, setUserEmail] = useState(() => getStoredEmail())
  const [userRole, setUserRole] = useState(() => getStoredRole())

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthed(Boolean(localStorage.getItem('fesc-token')))
      setUserEmail(getStoredEmail())
      setUserRole(getStoredRole())
    }
    window.addEventListener('storage', handleAuthChange)
    window.addEventListener('fesc-auth', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleAuthChange)
      window.removeEventListener('fesc-auth', handleAuthChange)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('fesc-token')
    localStorage.removeItem('fesc-user')
    setIsAuthed(false)
    setUserEmail('')
    setUserRole('')
    window.dispatchEvent(new Event('fesc-auth'))
  }

  return (
    <>
      <header className="navbar">
        <Link to="/" className="brand">
          <img
            src="https://www.fesc.edu.co/portal/images/logo-fesc.png"
            alt="FESC"
            className="brand-logo"
          />
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
        </button>

        {/* Desktop navigation */}
        <div className="nav-actions desktop-nav">
          <Link to="/reservas" className="btn ghost small">
            Ver disponibilidad
          </Link>
          {userRole === 'admin' && (
            <Link to="/admin" className="btn ghost small">
              Admin
            </Link>
          )}
          {isAuthed && userEmail && <span className="user-email">{userEmail}</span>}
          {isAuthed ? (
            <button type="button" className="btn primary small" onClick={handleLogout}>
              Cerrar sesión
            </button>
          ) : (
            <Link to="/login" className="btn primary small">
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      {/* Mobile navigation menu */}
      <div className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-content">
          {/* Solo el logo sin texto */}
          <div className="mobile-nav-logo">
            <img
              src="https://www.fesc.edu.co/portal/images/logo-fesc.png"
              alt="FESC"
            />
          </div>
          
          <Link to="/reservas" className="mobile-nav-item" onClick={() => setIsMenuOpen(false)}>
            Ver disponibilidad
          </Link>
          {userRole === 'admin' && (
            <Link to="/admin" className="mobile-nav-item" onClick={() => setIsMenuOpen(false)}>
              Admin
            </Link>
          )}
          {isAuthed && userEmail && <span className="user-email mobile">{userEmail}</span>}
          {isAuthed ? (
            <button
              type="button"
              className="mobile-nav-item primary"
              onClick={() => {
                handleLogout()
                setIsMenuOpen(false)
              }}
            >
              Cerrar sesión
            </button>
          ) : (
            <Link to="/login" className="mobile-nav-item primary" onClick={() => setIsMenuOpen(false)}>
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

export default NavBar
