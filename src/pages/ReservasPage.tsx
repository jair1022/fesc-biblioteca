import React, { useMemo, useState } from 'react'

type CellType = 'empty' | 'pc' | 'desk2' | 'desk3x5' | 'reception' | 'wall'
type Cell = { type: CellType; stamp?: string; w?: number; h?: number; head?: boolean }

const rows = 10
const cols = 24
const wallCol = 12
const STORAGE_KEY = 'layout-grid-v1'

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

type Room = { key: 'sala1' | 'sala2'; name: string; layout: Cell[][] }

const splitRooms = (grid: Cell[][]): Room[] => {
  const left = grid.map((row) => row.slice(0, wallCol))
  const right = grid.map((row) => row.slice(wallCol + 1))
  return [
    { key: 'sala1', name: 'Sala 1', layout: left },
    { key: 'sala2', name: 'Sala 2', layout: right },
  ]
}

const ReservasPage = () => {
  const [grid] = useState<Cell[][]>(loadGrid)

  const rooms = useMemo(() => splitRooms(grid), [grid])

  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(rooms.map((room) => [room.key, []])),
  )

  const toggleSeat = (roomKey: string, seatId: string, cellType: CellType) => {
    if (cellType !== 'pc') return
    setSelected((prev) => {
      const current = prev[roomKey] || []
      const exists = current.includes(seatId)
      const next = exists ? current.filter((id) => id !== seatId) : [...current, seatId]
      return { ...prev, [roomKey]: next }
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
      return { key: room.key, totalSeats: pcs, occupied: 0, available: pcs, selectedCount }
    })
  }, [rooms, selected])

  return (
    <div className="page reservas">
      <header className="section-head reservas-head">
        <div className="header-copy">
          <p className="eyebrow">Disponibilidad • Visual</p>
          <h2>Plano de salas tipo café internet</h2>
          <p className="lead">
            Dos salas sincronizadas con Admin; solo los computadores son seleccionables para reserva.
          </p>
        </div>
        <div className="legend-box pill">
          <span className="legend-item">
            <span className="dot free" /> Disponible
          </span>
          <span className="legend-item">
            <span className="dot selected" /> Seleccionado
          </span>
          <span className="legend-item">
            <span className="dot busy muted" /> Bloque (mesas/recepción)
          </span>
        </div>
      </header>

      <section className="rooms-grid">
        {rooms.map((room) => {
          const colsRoom = room.layout[0]?.length || 1
          const count = counts.find((c) => c.key === room.key)
          return (
            <article key={room.name} className="room-card room-card--plan">
              <div className="room-header">
                <div>
                  <p className="eyebrow">{room.name}</p>
                  <h3>Plano sincronizado</h3>
                </div>
                <button
                  className="btn ghost small"
                  onClick={() => setSelected((prev) => ({ ...prev, [room.key]: [] }))}
                >
                  Reset selección
                </button>
              </div>

              <div
                className="room-grid room-grid--plan"
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
                    return (
                      <button
                        key={id}
                        type="button"
                        style={style}
                        className={`cell seat ${isSelected ? 'selected' : 'free'}`}
                        onClick={() => toggleSeat(room.key, id, cell.type)}
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
          <p className="eyebrow">Resumen visual</p>
          <h3>Reserva simulada</h3>
          <p className="lead">Selecciones actuales por sala (mock, sin backend).</p>
          <div className="summary-list">
            {rooms.map((room) => (
              <div key={room.key} className="summary-row">
                <strong>{room.name}:</strong>{' '}
                {selected[room.key]?.length
                  ? selected[room.key]
                      .map((id) => {
                        const [row, col] = id.split('-')
                        return `F${Number(row) + 1}-E${Number(col) + 1}`
                      })
                      .join(', ')
                  : 'Sin selección'}
              </div>
            ))}
          </div>
        </div>
        <div className="summary-actions">
          <button className="btn ghost">Cancelar</button>
          <button className="btn primary">Confirmar (mock)</button>
        </div>
      </section>
    </div>
  )
}

export default ReservasPage
