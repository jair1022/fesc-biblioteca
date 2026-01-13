import { Link } from 'react-router-dom'

const NavBar = () => {
  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <img
          src="https://www.fesc.edu.co/portal/archivos/identidad/Logo-FESC+30.png"
          alt="FESC"
          className="brand-logo"
        />
        <div className="brand-text">
          <span className="brand-title">FESC</span>
          <small>Reserva de Computadores</small>
        </div>
      </Link>
      <div className="nav-actions">
        <Link to="/reservas" className="btn ghost small">
          Ver disponibilidad
        </Link>
        <Link to="/admin" className="btn ghost small">
          Admin
        </Link>
        <Link to="/login" className="btn primary small">
          Iniciar sesión
        </Link>
      </div>
    </header>
  )
}

export default NavBar
