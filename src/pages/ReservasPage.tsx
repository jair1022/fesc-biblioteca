import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type CellType = 'empty' | 'pc' | 'desk2' | 'desk3x5' | 'reception' | 'wall'
type Cell = { type: CellType; stamp?: string; w?: number; h?: number; head?: boolean }
type RoomKey = 'sala1' | 'sala2'
type RoomStatus = Record<RoomKey, { disabled: boolean; reservedBy?: string | null }>
type OccupiedSeat = { roomKey: RoomKey; seatRow: number; seatCol: number; status: 'pending' | 'active' }

const rows = 10
const cols = 24
const wallCol = 12
const STORAGE_KEY = 'layout-grid-v1'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const getToken = () => localStorage.getItem('fesc-token') || ''

const defaultRoomStatus: RoomStatus = {
  sala1: { disabled: false, reservedBy: null },
  sala2: { disabled: false, reservedBy: null },
}

const buildFallbackGrid = (): Cell[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => (c === wallCol ? { type: 'wall' } : { type: 'empty' })),
  )

const loadGrid = (): Cell[][] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildFallbackGrid()
    const parsed = JSON.parse(raw) as { grid: Cell[][]; rows: number; cols: number; wallCol: number }
    if (parsed.rows === rows && parsed.cols === cols && parsed.wallCol === wallCol && parsed.grid) {
      return parsed.grid.map((row) =>
        row.map((cell) => ({
          type: cell.type,
          stamp: cell.stamp,
          w: cell.w,
          h: cell.h,
          head: cell.head,
        })),
      )
    }
    return buildFallbackGrid()
  } catch {
    return buildFallbackGrid()
  }
}

type Room = { key: RoomKey; name: string; layout: Cell[][] }

const splitRooms = (grid: Cell[][]): Room[] => {
  const left = grid.map((row) => row.slice(0, wallCol))
  const right = grid.map((row) => row.slice(wallCol + 1))
  return [
    { key: 'sala1', name: 'Sala 1', layout: left },
    { key: 'sala2', name: 'Sala 2', layout: right },
  ]
}

const ReservasPage = () => {
  const [grid, setGrid] = useState<Cell[][]>(loadGrid)
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(defaultRoomStatus)
  const [roomLoading, setRoomLoading] = useState(false)
  const [roomError, setRoomError] = useState('')
  const [layoutLoading, setLayoutLoading] = useState(false)
  const [layoutError, setLayoutError] = useState('')
  const [occupiedSeats, setOccupiedSeats] = useState<OccupiedSeat[]>([])
  const [reservationLoading, setReservationLoading] = useState(false)
  const [reservationError, setReservationError] = useState('')

  const rooms = useMemo(() => splitRooms(grid), [grid])

  const occupiedByRoom = useMemo(() => {
    const map: Record<RoomKey, Set<string>> = {
      sala1: new Set(),
      sala2: new Set(),
    }
    occupiedSeats.forEach((seat) => {
      map[seat.roomKey]?.add(`${seat.seatRow}-${seat.seatCol}`)
    })
    return map
  }, [occupiedSeats])

  const [selected, setSelected] = useState<Record<RoomKey, string[]>>({
    sala1: [],
    sala2: [],
  })

  const fetchRoomStatus = async () => {
    setRoomError('')
    setRoomLoading(true)
    try {
      const response = await fetch(`${API_URL}/rooms/status`)
      const data = await response.json()
      if (!response.ok) {
        setRoomError(data.message || 'No se pudo cargar el estado de salas.')
        return
      }
      setRoomStatus(data.rooms || defaultRoomStatus)
    } catch {
      setRoomError('No se pudo conectar con el servidor.')
    } finally {
      setRoomLoading(false)
    }
  }

  useEffect(() => {
    fetchRoomStatus()
  }, [])

  const fetchOccupied = async () => {
    const token = getToken()
    if (!token) return
    try {
      const response = await fetch(`${API_URL}/reservations/occupied`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) return
      setOccupiedSeats(
        (data.seats || []).map((seat: { room_key: RoomKey; seat_row: number; seat_col: number; status: string }) => ({
          roomKey: seat.room_key,
          seatRow: seat.seat_row,
          seatCol: seat.seat_col,
          status: seat.status,
        })),
      )
    } catch {
      // ignore occupied fetch errors
    }
  }

  const fetchLayout = async () => {
    setLayoutError('')
    setLayoutLoading(true)
    try {
      const response = await fetch(`${API_URL}/layout/grid`)
      const data = await response.json()
      if (!response.ok) {
        setLayoutError(data.message || 'No se pudo cargar el tablero.')
        return
      }
      const cells = data.grid?.cells
      if (!Array.isArray(cells)) {
        setLayoutError('No se pudo cargar el tablero.')
        return
      }
      const cloned = cells.map((row: Cell[]) =>
        row.map((cell) => ({
          type: cell.type,
          stamp: cell.stamp,
          w: cell.w,
          h: cell.h,
          head: cell.head,
        })),
      )
      setGrid(cloned)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid: cloned, rows, cols, wallCol }))
    } catch {
      setLayoutError('No se pudo conectar con el servidor.')
    } finally {
      setLayoutLoading(false)
    }
  }

  useEffect(() => {
    fetchLayout()
  }, [])

  useEffect(() => {
    fetchOccupied()
  }, [])

  const toggleSeat = (roomKey: RoomKey, seatId: string, cellType: CellType) => {
    if (cellType !== 'pc') return
    if (occupiedByRoom[roomKey]?.has(seatId)) return
    setSelected((prev) => {
      // Allow only one PC total across all rooms
      const currentSelection = Object.values(prev).flat()
      const isCurrentlySelected = currentSelection.includes(seatId)
      
      if (isCurrentlySelected) {
        // Deselect if already selected
        return { sala1: [], sala2: [] }
      }
      // Select new PC and clear all other selections
      return {
        sala1: roomKey === 'sala1' ? [seatId] : [],
        sala2: roomKey === 'sala2' ? [seatId] : [],
      }
    })
  }

  const counts = useMemo(() => {
    return rooms.map((room) => {
      let pcs = 0
      room.layout.forEach((row) =>
        row.forEach((cell) => {
          if (cell.type === 'pc') pcs += 1
        }),
      )
      const selectedCount = selected[room.key]?.length || 0
      const occupiedCount = occupiedByRoom[room.key]?.size || 0
      return {
        key: room.key,
        totalSeats: pcs,
        occupied: occupiedCount,
        available: Math.max(pcs - occupiedCount, 0),
        selectedCount,
      }
    })
  }, [rooms, selected, occupiedByRoom])

  const handleConfirmReservation = async () => {
    setReservationError('')
    const token = getToken()
    if (!token) {
      setReservationError('Debes iniciar sesión para reservar.')
      return
    }
    const selectedRoom = rooms.find((room) => selected[room.key]?.length)
    const selectedSeat = selectedRoom ? selected[selectedRoom.key]?.[0] : null
    if (!selectedRoom || !selectedSeat) {
      setReservationError('Selecciona un computador disponible.')
      return
    }
    const [row, col] = selectedSeat.split('-')
    setReservationLoading(true)
    try {
      const response = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomKey: selectedRoom.key,
          seatRow: Number(row),
          seatCol: Number(col),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setReservationError(data.message || 'No se pudo crear la reserva.')
        await fetchOccupied()
        return
      }
      localStorage.setItem('fesc-last-reservation', JSON.stringify(data.reservation))
      window.location.assign('/reservas/confirmacion')
    } catch {
      setReservationError('No se pudo conectar con el servidor.')
    } finally {
      setReservationLoading(false)
    }
  }

  return (
    <div className="page reservas">
      <header className="section-head reservas-head">
        <div className="header-copy">
          <p className="eyebrow">Disponibilidad • Visual</p>
          <h2>Plano de salas tipo café internet</h2>
          <p className="lead">
            Dos salas sincronizadas con Admin; solo los computadores son seleccionables para reserva.
          </p>
          {layoutLoading && <p className="form-message">Cargando tablero...</p>}
          {layoutError && <p className="form-message error">{layoutError}</p>}
          {roomLoading && <p className="form-message">Cargando estado de salas...</p>}
          {roomError && <p className="form-message error">{roomError}</p>}
          {reservationError && <p className="form-message error">{reservationError}</p>}
          <div className="history-actions">
            <Link className="btn ghost small" to="/mis-reservas">
              Ver mis reservas
            </Link>
          </div>
        </div>
        <div className="legend-box pill">
          <span className="legend-item">
            <span className="dot free" /> Disponible
          </span>
          <span className="legend-item">
            <span className="dot selected" /> Seleccionado
          </span>
          <span className="legend-item">
            <span className="dot busy muted" /> Ocupado / Bloque
          </span>
        </div>
      </header>

      <section className="rooms-grid">
        {rooms.map((room) => {
          const colsRoom = room.layout[0]?.length || 1
          const count = counts.find((c) => c.key === room.key)
          const isRoomDisabled = roomStatus[room.key]?.disabled
          const reservedBy = roomStatus[room.key]?.reservedBy
          
          return (
            <article key={room.name} className={`room-card room-card--plan ${isRoomDisabled ? 'room-disabled' : ''}`}>
              <div className="room-header">
                <div>
                  <p className="eyebrow">{room.name}</p>
                  <h3>Plano sincronizado</h3>
                </div>
                <button
                  className="btn ghost small"
                  onClick={() => setSelected((prev) => ({ ...prev, [room.key]: [] }))}
                  disabled={isRoomDisabled}
                >
                  Reset selección
                </button>
              </div>

              {isRoomDisabled && (
                <div className="room-disabled-overlay">
                  <div className="reservation-message">
                    <p className="reservation-title">SALA RESERVADA POR:</p>
                    <p className="reservation-name">{reservedBy || 'NOMBRE DE ALGUIEN'}</p>
                  </div>
                </div>
              )}

              <div
                className={`room-grid room-grid--plan ${isRoomDisabled ? 'disabled' : ''}`}
                style={{
                  gridTemplateColumns: `repeat(${colsRoom}, minmax(16px, 1fr))`,
                }}
              >
                {room.layout.flatMap((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    if (cell.stamp && !cell.head) return null
                    const id = `${rIdx}-${cIdx}`
                    const style: React.CSSProperties = { gridRow: rIdx + 1, gridColumn: cIdx + 1 }
                    if (cell.head && cell.w && cell.h) {
                      style.gridRowEnd = `span ${cell.h}`
                      style.gridColumnEnd = `span ${cell.w}`
                    }
                    if (cell.type === 'empty') return <div key={id} className="cell gap" style={style} />
                    if (cell.type === 'wall') return <div key={id} className="cell gap" style={style} />
                    if (cell.type === 'desk2')
                      return (
                        <div key={id} style={style} className="cell block mesa2">
                          <span>Mesa</span>
                        </div>
                      )
                    if (cell.type === 'desk3x5')
                      return (
                        <div key={id} style={style} className="cell block mesa3x5">
                          <span>Mesa larga</span>
                        </div>
                      )
                    if (cell.type === 'reception')
                      return (
                        <div key={id} style={style} className="cell block reception">
                          <span>Recepción</span>
                        </div>
                      )
                    const isSelected = selected[room.key]?.includes(id)
                    const isOccupied = occupiedByRoom[room.key]?.has(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        style={style}
                        className={`cell seat ${isSelected ? 'selected' : isOccupied ? 'busy' : 'free'} ${isRoomDisabled ? 'disabled' : ''}`}
                        onClick={() => !isRoomDisabled && !isOccupied && toggleSeat(room.key, id, cell.type)}
                        disabled={isRoomDisabled || isOccupied}
                        title={`${room.name} • Fila ${rIdx + 1}, Equipo ${cIdx + 1}`}
                      >
                        <svg className="workstation" viewBox="0 0 100 100" aria-hidden>
                          <rect className="monitor-shape" x="30" y="28" width="40" height="24" rx="4" />
                          <rect className="monitor-stand" x="46" y="52" width="8" height="12" rx="2" />
                          <rect className="desk-strip" x="22" y="66" width="56" height="10" rx="3" />
                        </svg>
                      </button>
                    )
                  }),
                )}
              </div>

              <div className="room-meta">
                <span>Equipos: {count?.totalSeats}</span>
                <span>Seleccionados: {count?.selectedCount}</span>
              </div>
            </article>
          )
        })}
      </section>

      <section className="summary-card">
        <div>
          <p className="eyebrow">Resumen de reserva</p>
          <h3>Tu computador seleccionado</h3>
          <p className="lead">Puedes reservar solo un computador en total (independientemente de la sala).</p>
          <div className="summary-list">
            {rooms.map((room) => {
              const selectedSeat = selected[room.key]?.[0]
              const isRoomDisabled = roomStatus[room.key]?.disabled
              
              if (isRoomDisabled) {
                return (
                  <div key={room.key} className="summary-row disabled-room">
                    <strong>{room.name}:</strong>
                    <span className="unavailable">Sala no disponible</span>
                  </div>
                )
              }
              
              return (
                <div key={room.key} className="summary-row">
                  <strong>{room.name}:</strong>{' '}
                  {selectedSeat ? (
                    <span className="selected-seat">
                      {(() => {
                        const [row, col] = selectedSeat.split('-')
                        return `Computador F${Number(row) + 1}-E${Number(col) + 1}`
                      })()}
                    </span>
                  ) : (
                    <span className="no-selection">Sin seleccionar</span>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="reservation-info">
            <p><strong>Importante:</strong> Solo puedes reservar un computador. Si seleccionas otro, tu elección anterior será reemplazada.</p>
          </div>
        </div>
        <div className="summary-actions">
          <button className="btn ghost">Cancelar selección</button>
          <button 
            className="btn primary"
            onClick={handleConfirmReservation}
            disabled={
              reservationLoading ||
              !Object.values(selected).some((roomSelections) => roomSelections.length > 0)
            }
          >
            {reservationLoading ? 'Confirmando...' : 'Confirmar reserva'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ReservasPage
