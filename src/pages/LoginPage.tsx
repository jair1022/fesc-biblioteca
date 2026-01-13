const LoginPage = () => {
  return (
    <div className="page login">
      <div className="auth-card">
        <p className="eyebrow">Acceso institucional</p>
        <h2>Inicia sesión</h2>
        <p className="lead">Solo correos @fesc.edu.co.</p>
        <form className="auth-form">
          <label className="field">
            <span>Correo institucional</span>
            <input type="email" placeholder="nombre.apellido@fesc.edu.co" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" placeholder="••••••••" />
          </label>
          <button type="button" className="btn primary">Entrar</button>
        </form>
        <div className="auth-meta">
          <span>Recuperar contraseña</span>
          <span>Nuevo usuario: solicitar acceso</span>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
