import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

type RequireAuthProps = {
  children: ReactNode
  roles?: string[]
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

const RequireAuth = ({ children, roles }: RequireAuthProps) => {
  const location = useLocation()
  const [token, setToken] = useState(() => localStorage.getItem('fesc-token'))
  const [role, setRole] = useState(() => getStoredRole())

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem('fesc-token'))
      setRole(getStoredRole())
    }
    window.addEventListener('storage', handleAuthChange)
    window.addEventListener('fesc-auth', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleAuthChange)
      window.removeEventListener('fesc-auth', handleAuthChange)
    }
  }, [])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default RequireAuth
