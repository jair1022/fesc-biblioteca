import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaLaptop, FaTable, FaEraser } from 'react-icons/fa'
import { MdTableRestaurant, MdRoomService } from 'react-icons/md'

type CellType = 'empty' | 'pc' | 'desk2' | 'desk3x5' | 'reception' | 'wall'
type Cell = { type: CellType; stamp?: string; w?: number; h?: number; head?: boolean }
type RoomKey = 'sala1' | 'sala2'
type RoomStatus = Record<RoomKey, { disabled: boolean; reservedBy?: string | null }>
type LayoutVersion = { id: string; savedAt: string }
type ReservationRequest = {
  id: string
  status: 'pending' | 'active'
  code: string
  seatRow: number
  seatCol: number
  requestedAt: string
  roomKey: string
  roomName: string
  userName: string | null
  userEmail: string
}

const rows = 10
const cols = 24
const wallCol = 12
const STORAGE_KEY = 'layout-grid-v1'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const footprints: Record<Exclude<CellType, 'wall' | 'empty'>, { w: number; h: number }> = {
  pc: { w: 1, h: 1 },
  desk2: { w: 2, h: 2 },
  desk3x5: { w: 5, h: 3 }, // 3 hacia abajo, 5 horizontal
  reception: { w: 1, h: 7 }, // 1 de ancho, 7 alto
}

const buildInitialGrid = (): Cell[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => {
      if (c === wallCol) return { type: 'wall' }
      return { type: 'empty' }
    }),
  )

const normalizeGrid = (grid: Cell[][]): Cell[][] => {
  const seen = new Set<string>()
  return grid.map((row) =>
    row.map((cell) => {
      if (cell.stamp) {
        if (!seen.has(cell.stamp)) {
          seen.add(cell.stamp)
          return { ...cell, head: true }
        }
        return { ...cell, head: false }
      }
      return { ...cell, head: false }
    }),
  )
}

const defaultRoomStatus: RoomStatus = {
  sala1: { disabled: false, reservedBy: null },
  sala2: { disabled: false, reservedBy: null },
}

const formatTime = (value: Date) =>
  value.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const getToken = () => localStorage.getItem('fesc-token') || ''

const loadGrid = (): Cell[][] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildInitialGrid()
    const parsed = JSON.parse(raw) as {
      grid: Cell[][]
      rows: number
      cols: number
      wallCol: number
    }
    if (parsed.rows === rows && parsed.cols === cols && parsed.wallCol === wallCol && parsed.grid) {
      const cloned = parsed.grid.map((row) =>
        row.map((cell) => ({
          type: cell.type,
          stamp: cell.stamp,
          w: cell.w,
          h: cell.h,
          head: cell.head,
        })),
      )
      return normalizeGrid(cloned)
    }
    return buildInitialGrid()
  } catch {
    return buildInitialGrid()
  }
}

const palette = [
  { key: 'pc' as CellType, label: 'Computador', color: '#2563eb', size: '1x1', icon: 'pc' },
  { key: 'desk2' as CellType, label: 'Mesa', color: '#10b981', size: '2x2', icon: 'desk2' },
  { key: 'desk3x5' as CellType, label: 'Mesa larga', color: '#0ea5e9', size: '3x5', icon: 'desk3x5' },
  { key: 'reception' as CellType, label: 'Recepción', color: '#f59e0b', size: '1x7', icon: 'reception' },
  { key: 'empty' as CellType, label: 'Borrar', color: '#9ca3af', size: '', icon: 'erase' },
]

const AdminPage = () => {
  const [grid, setGrid] = useState<Cell[][]>(loadGrid)
  const [tool, setTool] = useState<CellType>('pc')
  const [isDragging, setIsDragging] = useState(false)
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(defaultRoomStatus)
  const [reservedNames, setReservedNames] = useState<Record<RoomKey, string>>({
    sala1: '',
    sala2: '',
  })
  const [layoutLoading, setLayoutLoading] = useState(false)
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [layoutError, setLayoutError] = useState('')
  const [layoutMessage, setLayoutMessage] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [versions, setVersions] = useState<LayoutVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [versionLoading, setVersionLoading] = useState(false)
  const [versionError, setVersionError] = useState('')
  const [requests, setRequests] = useState<ReservationRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [requestsMessage, setRequestsMessage] = useState('')
  const [validationCodes, setValidationCodes] = useState<Record<string, string>>({})
  const [roomLoading, setRoomLoading] = useState(false)
  const [roomError, setRoomError] = useState('')
  const skipAutoSaveRef = useRef(true)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stats = useMemo(() => {
    let pcs = 0
    let desks = 0
    grid.forEach((row) =>
      row.forEach((cell) => {
        if (!cell.head) return
        if (cell.type === 'pc') pcs += 1
        if (cell.type === 'desk2' || cell.type === 'desk3x5' || cell.type === 'reception') desks += 1
      }),
    )
    return { pcs, desks }
  }, [grid])

  const eraseBlock = (r: number, c: number, base: Cell[][]): Cell[][] => {
    const target = base[r][c]
    if (!target) return base
    if (target.stamp) {
      return base.map((row) =>
        row.map((cell) =>
          cell.stamp === target.stamp
            ? { type: 'empty' as CellType, stamp: undefined, w: undefined, h: undefined, head: false }
            : cell,
        ),
      )
    }
    const next: Cell[][] = base.map((row) => row.map((cell) => ({ ...cell })))
    next[r][c] = { type: 'empty' }
    return next
  }

  const placeFootprint = (r: number, c: number, type: CellType, base: Cell[][]): Cell[][] => {
    if (type === 'empty') {
      return eraseBlock(r, c, base)
    }
    const fp = footprints[type as Exclude<CellType, 'empty' | 'wall'>]
    if (!fp) return base
    // Validar que cabe
    if (c + fp.w > cols || r + fp.h > rows) return base
    if (c <= wallCol && c + fp.w > wallCol) return base
    // Validar que todas las celdas destino estén libres (no muro, no ocupado)
    for (let i = 0; i < fp.h; i += 1) {
      for (let j = 0; j < fp.w; j += 1) {
        const rr = r + i
        const cc = c + j
        const target = base[rr]?.[cc]
        if (!target) return base
        if (target.type !== 'empty') return base
      }
    }
    const stamp = `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
    const next: Cell[][] = base.map((row) => row.map((cell) => ({ ...cell })))
    for (let i = 0; i < fp.h; i += 1) {
      for (let j = 0; j < fp.w; j += 1) {
        const rr = r + i
        const cc = c + j
        next[rr][cc] = { type, stamp, w: fp.w, h: fp.h, head: i === 0 && j === 0 }
      }
    }
    return next
  }

  const applyTool = (r: number, c: number) => {
    if (c === wallCol) return
    setGrid((prev) => placeFootprint(r, c, tool, prev))
  }

  const handleDown = (r: number, c: number) => {
    setIsDragging(true)
    applyTool(r, c)
  }

  const handleEnter = (r: number, c: number) => {
    if (isDragging) applyTool(r, c)
  }

  const resetGrid = () => setGrid(buildInitialGrid())

  const fetchLayout = async () => {
    setLayoutError('')
    setLayoutMessage('')
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
      const normalized = normalizeGrid(cloned)
      skipAutoSaveRef.current = true
      setGrid(normalized)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid: normalized, rows, cols, wallCol }))
    } catch {
      setLayoutError('No se pudo conectar con el servidor.')
    } finally {
      setLayoutLoading(false)
    }
  }

  const fetchRequests = async () => {
    setRequestsError('')
    setRequestsMessage('')
    setRequestsLoading(true)
    const token = getToken()
    if (!token) {
      setRequestsError('Debes iniciar sesión para ver solicitudes.')
      setRequestsLoading(false)
      return
    }
    try {
      const response = await fetch(`${API_URL}/reservations/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        setRequestsError(data.message || 'No se pudieron cargar las solicitudes.')
        return
      }
      setRequests(data.requests || [])
      setValidationCodes((prev) => {
        const next = { ...prev }
        ;(data.requests || []).forEach((request: ReservationRequest) => {
          if (!next[request.id]) next[request.id] = ''
        })
        return next
      })
    } catch {
      setRequestsError('No se pudo conectar con el servidor.')
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleValidateRequest = async (request: ReservationRequest) => {
    const token = getToken()
    if (!token) {
      setRequestsError('Debes iniciar sesión para validar.')
      return
    }
    const code = (validationCodes[request.id] || '').trim().toUpperCase()
    if (!code) {
      setRequestsError('Ingresa el código del estudiante.')
      return
    }
    setRequestsLoading(true)
    setRequestsError('')
    setRequestsMessage('')
    try {
      const response = await fetch(`${API_URL}/reservations/${request.id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (!response.ok) {
        setRequestsError(data.message || 'No se pudo validar la reserva.')
        return
      }
      setRequestsMessage('Reserva validada. Puede ingresar al PC.')
      await fetchRequests()
    } catch {
      setRequestsError('No se pudo conectar con el servidor.')
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleReleaseRequest = async (request: ReservationRequest) => {
    const token = getToken()
    if (!token) {
      setRequestsError('Debes iniciar sesión para liberar.')
      return
    }
    setRequestsLoading(true)
    setRequestsError('')
    setRequestsMessage('')
    try {
      const response = await fetch(`${API_URL}/reservations/${request.id}/release`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        setRequestsError(data.message || 'No se pudo liberar el PC.')
        return
      }
      setRequestsMessage('Equipo liberado y registro guardado.')
      await fetchRequests()
    } catch {
      setRequestsError('No se pudo conectar con el servidor.')
    } finally {
      setRequestsLoading(false)
    }
  }

  const fetchVersions = async () => {
    setVersionError('')
    setVersionLoading(true)
    try {
      const response = await fetch(`${API_URL}/layout/versions`)
      const data = await response.json()
      if (!response.ok) {
        setVersionError(data.message || 'No se pudo cargar el historial.')
        return
      }
      setVersions(data.versions || [])
    } catch {
      setVersionError('No se pudo conectar con el servidor.')
    } finally {
      setVersionLoading(false)
    }
  }

  const saveLayout = async (options?: {
    grid?: Cell[][]
    silent?: boolean
    refreshVersions?: boolean
    saveVersion?: boolean
  }) => {
    if (!options?.silent) {
      setLayoutError('')
      setLayoutMessage('')
    }
    setLayoutSaving(true)
    try {
      const targetGrid = options?.grid ?? grid
      const response = await fetch(`${API_URL}/layout/grid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grid: targetGrid,
          rows,
          cols,
          wallCol,
          saveVersion: options?.saveVersion === true,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setLayoutError(data.message || 'No se pudo guardar el tablero.')
        return
      }
      setLastSavedAt(formatTime(new Date()))
      if (!options?.silent) {
        setLayoutMessage(data.message || 'Tablero guardado.')
      }
      if (options?.refreshVersions) {
        await fetchVersions()
      }
    } catch {
      setLayoutError('No se pudo conectar con el servidor.')
    } finally {
      setLayoutSaving(false)
    }
  }

  const restoreVersion = async () => {
    if (!selectedVersionId) return
    setVersionError('')
    setVersionLoading(true)
    try {
      const response = await fetch(`${API_URL}/layout/versions/${selectedVersionId}`)
      const data = await response.json()
      if (!response.ok) {
        setVersionError(data.message || 'No se pudo cargar la versión.')
        return
      }
      const snapshot = data.snapshot
      if (!snapshot?.grid) {
        setVersionError('No se pudo cargar la versión.')
        return
      }
      const cloned = snapshot.grid.map((row: Cell[]) =>
        row.map((cell) => ({
          type: cell.type,
          stamp: cell.stamp,
          w: cell.w,
          h: cell.h,
          head: cell.head,
        })),
      )
      const normalized = normalizeGrid(cloned)
      skipAutoSaveRef.current = true
      setGrid(normalized)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid: normalized, rows, cols, wallCol }))
      await saveLayout({ grid: normalized, refreshVersions: true, saveVersion: false })
    } catch {
      setVersionError('No se pudo conectar con el servidor.')
    } finally {
      setVersionLoading(false)
    }
  }

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
      const rooms = data.rooms || defaultRoomStatus
      setRoomStatus(rooms)
      setReservedNames({
        sala1: rooms.sala1?.reservedBy || '',
        sala2: rooms.sala2?.reservedBy || '',
      })
    } catch {
      setRoomError('No se pudo conectar con el servidor.')
    } finally {
      setRoomLoading(false)
    }
  }

  const updateRoomStatus = async (key: RoomKey, disabled: boolean, reservedBy: string) => {
    setRoomError('')
    const nextReserved = disabled ? reservedBy.trim() || null : null
    setRoomStatus((prev) => ({
      ...prev,
      [key]: {
        disabled,
        reservedBy: nextReserved,
      },
    }))
    setRoomLoading(true)
    try {
      const response = await fetch(`${API_URL}/rooms/${key}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled, reservedBy }),
      })
      const data = await response.json()
      if (!response.ok) {
        setRoomError(data.message || 'No se pudo actualizar la sala.')
        await fetchRoomStatus()
        return
      }
      if (data.room) {
        setReservedNames((prev) => ({
          ...prev,
          [key]: data.room.reservedBy || '',
        }))
      }
    } catch {
      setRoomError('No se pudo conectar con el servidor.')
      await fetchRoomStatus()
    } finally {
      setRoomLoading(false)
    }
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid, rows, cols, wallCol }))
  }, [grid])

  useEffect(() => {
    fetchRoomStatus()
  }, [])

  useEffect(() => {
    fetchLayout()
  }, [])

  useEffect(() => {
    fetchVersions()
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false
      return
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveLayout({ silent: true, saveVersion: false })
    }, 900)
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [grid])

  return (
    <div className="page admin">
      <header className="section-head admin-simple">
        <p className="eyebrow">Panel administrativo • Constructor de salas</p>
        <h2>Arma las dos salas en una sola cuadrícula</h2>
        <p className="lead">
          Usa las herramientas (computador/mesa/borrar) y arrastra sobre la cuadrícula. El muro
          central divide Sala 1 y Sala 2.
        </p>
        <div className="admin-meta legend-box pill">
          <span className="legend-item">PCs: {stats.pcs}</span>
          <span className="legend-item">Mesas: {stats.desks}</span>
          <button className="btn ghost small" onClick={resetGrid}>
            Limpiar cuadrícula
          </button>
          <button
            className="btn primary small"
            onClick={() => saveLayout({ refreshVersions: true, saveVersion: true })}
            disabled={layoutSaving || layoutLoading}
          >
            {layoutSaving ? 'Guardando...' : 'Guardar tablero'}
          </button>
        </div>
        <p className="form-message">
          Autoguardado activo{lastSavedAt ? ` • Último guardado ${lastSavedAt}` : ''}
        </p>
        {layoutMessage && <p className="form-message">{layoutMessage}</p>}
        {layoutError && <p className="form-message error">{layoutError}</p>}
      </header>
      
      <div className="admin-palette-card">
        <div className="header-copy">
          <p className="eyebrow">Control de salas</p>
          <p className="lead">Inhabilitar sala y asignar reserva</p>
        </div>
        <div className="palette palette-grid">
          {(['sala1', 'sala2'] as RoomKey[]).map((key) => {
            const status = roomStatus[key]
            const reservedValue = reservedNames[key] || ''
            return (
              <div key={key} className="room-control">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={status?.disabled || false}
                    onChange={() => updateRoomStatus(key, !status?.disabled, reservedValue)}
                    disabled={roomLoading}
                  />
                  <span className="toggle-slider"></span>
                  <span>{`Inhabilitar ${key === 'sala1' ? 'Sala 1' : 'Sala 2'}`}</span>
                </label>
                {status?.disabled && (
                  <div className="reservation-input">
                    <input
                      type="text"
                      placeholder="Nombre de quien reserva"
                      value={reservedValue}
                      onChange={(event) =>
                        setReservedNames((prev) => ({ ...prev, [key]: event.target.value }))
                      }
                      className="input-field"
                    />
                    <button
                      className="btn primary small"
                      onClick={() => updateRoomStatus(key, true, reservedValue)}
                      disabled={roomLoading}
                    >
                      Guardar nombre
                    </button>
                  </div>
                )}
                {status?.disabled && status?.reservedBy && (
                  <div className="reservation-info">
                    <p>
                      <strong>Reservada por:</strong> {status.reservedBy}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {roomError && <p className="form-message error">{roomError}</p>}
      </div>
      <div className="admin-palette-card">
        <div className="header-copy">
          <p className="eyebrow">Herramientas</p>
          <p className="lead">Selecciona el elemento a colocar</p>
        </div>
        <div className="palette palette-grid">
          {palette.map((item) => (
            <button
              key={item.key}
              className={`palette-btn ${tool === item.key ? 'active' : ''}`}
              style={{ borderColor: item.color }}
              onClick={() => setTool(item.key)}
            >
              <div className="palette-icon" aria-hidden>
                {item.icon === 'pc' && <FaLaptop size={24} />}
                {item.icon === 'desk2' && <FaTable size={24} />}
                {item.icon === 'desk3x5' && <MdTableRestaurant size={24} />}
                {item.icon === 'reception' && <MdRoomService size={24} />}
                {item.icon === 'erase' && <FaEraser size={22} />}
              </div>
              <span>{item.label}</span>
              {item.size && <small className="palette-size">{item.size}</small>}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-palette-card">
        <div className="header-copy">
          <p className="eyebrow">Solicitudes</p>
          <p className="lead">Valida códigos y libera PCs al finalizar</p>
        </div>
        <div className="history-actions">
          <button className="btn ghost small" onClick={fetchRequests} disabled={requestsLoading}>
            {requestsLoading ? 'Cargando...' : 'Actualizar solicitudes'}
          </button>
        </div>
        {requestsError && <p className="form-message error">{requestsError}</p>}
        {requestsMessage && <p className="form-message success">{requestsMessage}</p>}
        <div className="reservations-list">
          {requests.length === 0 && !requestsLoading && (
            <p className="form-message">Sin solicitudes activas.</p>
          )}
          {requests.map((request) => (
            <article key={request.id} className="card reservation-card">
              <div className="reservation-card-head">
                <div>
                  <h3>{request.roomName}</h3>
                  <p className="lead">
                    {request.userName || request.userEmail} · PC F{request.seatRow + 1}-E
                    {request.seatCol + 1}
                  </p>
                  <p className="muted">Solicitada: {formatDateTime(request.requestedAt)}</p>
                  <p className="muted">Código generado: {request.code}</p>
                </div>
                <span className={`badge ${request.status}`}>
                  {request.status === 'pending' ? 'Pendiente' : 'Activa'}
                </span>
              </div>
              <div className="reservation-card-body">
                <label className="field inline">
                  <span>Código</span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="ABC123"
                    value={validationCodes[request.id] || ''}
                    onChange={(event) =>
                      setValidationCodes((prev) => ({ ...prev, [request.id]: event.target.value }))
                    }
                  />
                </label>
                <div className="history-actions">
                  {request.status === 'pending' && (
                    <button
                      className="btn primary small"
                      onClick={() => handleValidateRequest(request)}
                      disabled={requestsLoading}
                    >
                      Validar ingreso
                    </button>
                  )}
                  {request.status === 'active' && (
                    <button
                      className="btn ghost small"
                      onClick={() => handleReleaseRequest(request)}
                      disabled={requestsLoading}
                    >
                      Liberar PC
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="admin-palette-card">
        <div className="header-copy">
          <p className="eyebrow">Historial</p>
          <p className="lead">Restaura versiones anteriores del tablero</p>
        </div>
        <div className="reservation-input history-panel">
          <select
            className="input-field"
            value={selectedVersionId}
            onChange={(event) => setSelectedVersionId(event.target.value)}
          >
            <option value="">Selecciona una versión</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {new Date(version.savedAt).toLocaleString('es-CO')}
              </option>
            ))}
          </select>
          <div className="history-actions">
            <button className="btn ghost small" onClick={fetchVersions} disabled={versionLoading}>
              {versionLoading ? 'Actualizando...' : 'Actualizar historial'}
            </button>
            <button
              className="btn primary small"
              onClick={restoreVersion}
              disabled={!selectedVersionId || versionLoading}
            >
              Restaurar versión
            </button>
          </div>
        </div>
        {versionError && <p className="form-message error">{versionError}</p>}
      </div>

      <div
        className="builder-grid"
        onMouseLeave={() => setIsDragging(false)}
        onMouseUp={() => setIsDragging(false)}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(32px, 1fr))` }}
      >
        {grid.flatMap((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (cell.stamp && !cell.head) return null
            const style: React.CSSProperties = {
              gridRow: rIdx + 1,
              gridColumn: cIdx + 1,
            }
            if (cell.head && cell.w && cell.h) {
              style.gridRowEnd = `span ${cell.h}`
              style.gridColumnEnd = `span ${cell.w}`
            }
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                style={style}
                className={`builder-cell ${cell.type === 'wall' ? 'wall' : ''}`}
                onMouseDown={() => handleDown(rIdx, cIdx)}
                onMouseEnter={() => handleEnter(rIdx, cIdx)}
                role="presentation"
              >
                {cell.type === 'pc' && (
                  <svg className="workstation small" viewBox="0 0 100 100" aria-hidden>
                    <rect className="monitor-shape" x="30" y="28" width="40" height="24" rx="4" />
                    <rect className="monitor-stand" x="46" y="52" width="8" height="12" rx="2" />
                    <rect className="desk-strip" x="22" y="66" width="56" height="10" rx="3" />
                  </svg>
                )}
                {cell.type === 'desk2' && (
                  <div className="block mesa2">
                    <span>Mesa</span>
                  </div>
                )}
                {cell.type === 'desk3x5' && (
                  <div className="block mesa3x5">
                    <span>Mesa larga</span>
                  </div>
                )}
                {cell.type === 'reception' && (
                  <div className="block reception">
                    <span>Recepción</span>
                  </div>
                )}
              </div>
            )
          }),
        )}
      </div>
      <div className="legend-grid">
        <span className="legend-item">
          <span className="legend-swatch pc" /> Computador
        </span>
        <span className="legend-item">
          <span className="legend-swatch desk" /> Mesa 2x2 / 3x5
        </span>
        <span className="legend-item">
          <span className="legend-swatch reception" /> Recepción
        </span>
        <span className="legend-item">
          <span className="legend-swatch wall" /> Muro (divide salas)
        </span>
      </div>
    </div>
  )
}

export default AdminPage
