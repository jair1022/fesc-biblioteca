import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const payload =
        mode === 'register'
          ? { email, password, fullName }
          : { email, password }

      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.message || 'No se pudo completar la solicitud.')
        return
      }

      if (mode === 'login') {
        if (data.token) {
          localStorage.setItem('fesc-token', data.token)
          if (data.user) {
            localStorage.setItem('fesc-user', JSON.stringify(data.user))
          }
          window.dispatchEvent(new Event('fesc-auth'))
        }
        setSuccess('Inicio de sesión exitoso.')
        const target = (location.state as { from?: string } | null)?.from || '/'
        navigate(target, { replace: true })
      } else {
        setSuccess('Registro exitoso. Ya puedes iniciar sesión.')
        setMode('login')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page login">
      <div className="auth-card">
        <p className="eyebrow">Acceso institucional</p>
        <h2>{mode === 'login' ? 'Inicia sesión' : 'Crear cuenta'}</h2>
        <p className="lead">Solo correos @fesc.edu.co.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className="field">
              <span>Nombre completo</span>
              <input
                type="text"
                placeholder="Nombre Apellido"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
          )}
          <label className="field">
            <span>Correo institucional</span>
            <input
              type="email"
              placeholder="nombre.apellido@fesc.edu.co"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="form-message error">{error}</p>}
          {success && <p className="form-message success">{success}</p>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrar'}
          </button>
        </form>
        <div className="auth-meta">
          <span>Recuperar contraseña</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}
          >
            {mode === 'login' ? 'Nuevo usuario: registrarse' : 'Ya tengo cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
