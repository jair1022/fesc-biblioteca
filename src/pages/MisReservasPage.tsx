import { useEffect, useMemo, useState } from 'react'

type ReservationStatus = 'pending' | 'active' | 'completed' | 'cancelled'
type ReservationItem = {
  id: string
  status: ReservationStatus
  code: string
  seatRow: number
  seatCol: number
  startAt: string
  endAt: string
  createdAt: string
  roomKey: string
  roomName: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const getToken = () => localStorage.getItem('fesc-token') || ''

const statusLabel: Record<ReservationStatus, string> = {
  pending: 'Pendiente',
  active: 'Activa',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
}

const formatTime = (value: Date) =>
  value.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const formatDay = (value: Date) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  return value.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

const formatRange = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)
  return `${formatDay(start)}, ${formatTime(start)} - ${formatTime(end)}`
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatDuration = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const diffMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

const MisReservasPage = () => {
  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cancellingId, setCancellingId] = useState('')
  const [pendingCancel, setPendingCancel] = useState<ReservationItem | null>(null)

  const fetchReservations = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    const token = getToken()
    if (!token) {
      setError('Debes iniciar sesión para ver tu historial.')
      setLoading(false)
      return
    }
    try {
      const response = await fetch(`${API_URL}/reservations/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'No se pudo cargar el historial.')
        return
      }
      setReservations(data.reservations || [])
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (reservationId: string) => {
    const token = getToken()
    if (!token) {
      setError('Debes iniciar sesión para cancelar la reserva.')
      return
    }
    setCancellingId(reservationId)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${API_URL}/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'No se pudo cancelar la reserva.')
        return
      }
      await fetchReservations()
      setSuccess('Reserva cancelada correctamente.')
      window.setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCancellingId('')
    }
  }

  const handleConfirmCancel = async () => {
    if (!pendingCancel) return
    await handleCancel(pendingCancel.id)
    setPendingCancel(null)
  }

  const getSeatLabel = (item: ReservationItem) => `PC F${item.seatRow + 1}-E${item.seatCol + 1}`

  useEffect(() => {
    fetchReservations()
  }, [])

  const upcoming = useMemo(
    () => reservations.filter((item) => item.status === 'pending' || item.status === 'active'),
    [reservations],
  )
  const past = useMemo(
    () => reservations.filter((item) => item.status === 'completed' || item.status === 'cancelled'),
    [reservations],
  )

  const renderCard = (item: ReservationItem) => (
    <article key={item.id} className="mis-reserva-card">
      <div className="mis-reserva-head">
        <div>
          <p className="eyebrow">{item.roomName}</p>
          <h3>{getSeatLabel(item)}</h3>
        </div>
        <span className={`badge ${item.status}`}>{statusLabel[item.status]}</span>
      </div>
      <div className="mis-reserva-chips">
        <span className="time-chip">{formatRange(item.startAt, item.endAt)}</span>
        <span className="time-chip subtle">Duración: {formatDuration(item.startAt, item.endAt)}</span>
      </div>
      <div className="mis-reserva-meta">
        <span className="muted">Código: {item.code}</span>
        <span className="muted">Solicitada: {formatDateTime(item.createdAt)}</span>
      </div>
      {item.status === 'pending' && (
        <div className="mis-reserva-actions">
          <button
            className="btn ghost small danger"
            onClick={() => setPendingCancel(item)}
            disabled={cancellingId === item.id}
          >
            {cancellingId === item.id ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      )}
    </article>
  )

  return (
    <div className="page mis-reservas">
      <header className="section-head">
        <div>
          <p className="eyebrow">Historial (visual)</p>
          <h2>Mis reservas</h2>
          <p className="lead">Tus reservas reales: próximas y finalizadas.</p>
        </div>
        <div className="mis-reservas-toolbar">
          <button className="btn ghost small" onClick={fetchReservations} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      {success && <div className="toast success">{success}</div>}
      {error && <p className="form-message error">{error}</p>}
      {loading && <p className="form-message">Cargando historial...</p>}
      {!loading && reservations.length === 0 && !error && (
        <p className="form-message">Aún no tienes reservas registradas.</p>
      )}

      <div className="mis-reservas-grid">
        <section className="mis-reservas-section">
          <div className="section-title">
            <h3>Próximas</h3>
            <span className="count-pill">{upcoming.length}</span>
          </div>
          <div className="mis-reservas-list">
            {upcoming.length === 0 ? (
              <p className="muted">Sin reservas próximas.</p>
            ) : (
              upcoming.map(renderCard)
            )}
          </div>
        </section>
        <section className="mis-reservas-section">
          <div className="section-title">
            <h3>Pasadas</h3>
            <span className="count-pill">{past.length}</span>
          </div>
          <div className="mis-reservas-list">
            {past.length === 0 ? (
              <p className="muted">Sin reservas pasadas.</p>
            ) : (
              past.map(renderCard)
            )}
          </div>
        </section>
      </div>

      {pendingCancel && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>¿Seguro?</h3>
            <p className="lead">
              Estás a punto de cancelar la reserva en {pendingCancel.roomName} · {getSeatLabel(pendingCancel)}.
            </p>
            <p className="muted">
              {formatRange(pendingCancel.startAt, pendingCancel.endAt)} · Duración:{' '}
              {formatDuration(pendingCancel.startAt, pendingCancel.endAt)}
            </p>
            <div className="modal-actions">
              <button className="btn ghost small" onClick={() => setPendingCancel(null)}>
                Volver
              </button>
              <button
                className="btn ghost small danger"
                onClick={handleConfirmCancel}
                disabled={cancellingId === pendingCancel.id}
              >
                {cancellingId === pendingCancel.id ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MisReservasPage
