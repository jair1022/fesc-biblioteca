import { Link } from 'react-router-dom'

const STORAGE_KEY = 'fesc-last-reservation'

type ReservationVoucher = {
  code: string
  reservedAt: string
  roomName: string
  roomKey: string
  seatRow: number
  seatCol: number
  userName?: string | null
  userEmail: string
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const loadReservation = (): ReservationVoucher | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReservationVoucher
  } catch {
    return null
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

const ReservaConfirmacionPage = () => {
  const reservation = loadReservation()
  const role = getStoredRole()

  if (!reservation) {
    return (
      <div className="page voucher">
        <header className="section-head">
          <p className="eyebrow">Reserva</p>
          <h2>No encontramos tu comprobante</h2>
          <p className="lead">Selecciona un computador y confirma la reserva para ver el voucher.</p>
          <div className="voucher-actions">
            <Link className="btn primary" to="/reservas">
              Volver a reservas
            </Link>
          </div>
        </header>
      </div>
    )
  }

  const displayName = reservation.userName || reservation.userEmail

  return (
    <div className="page voucher">
      <header className="section-head">
        <p className="eyebrow">Reserva confirmada</p>
        <h2>Tu comprobante de ingreso</h2>
        <p className="lead">
          Presenta este código al administrador para validar tu acceso al computador.
        </p>
      </header>

      <section className="voucher-card">
        <div className="voucher-grid">
          <div>
            <p className="eyebrow">Estudiante</p>
            <h3>{displayName}</h3>
            <p className="muted">{reservation.userEmail}</p>
          </div>
          <div>
            <p className="eyebrow">Reserva</p>
            <p className="lead">{reservation.roomName}</p>
            <p className="muted">
              PC F{reservation.seatRow + 1}-E{reservation.seatCol + 1}
            </p>
          </div>
          <div>
            <p className="eyebrow">Hora de solicitud</p>
            <p className="lead">{formatDateTime(reservation.reservedAt)}</p>
          </div>
          <div>
            <p className="eyebrow">Código de acceso</p>
            <span className="voucher-code">{reservation.code}</span>
          </div>
        </div>
        <div className="voucher-actions">
          <Link className="btn primary" to="/reservas">
            Volver a reservas
          </Link>
          {role === 'admin' && (
            <Link className="btn ghost" to="/admin">
              Ver panel admin
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}

export default ReservaConfirmacionPage
