import React, { useEffect, useMemo, useState } from 'react'
import { FaLaptop, FaTable, FaEraser } from 'react-icons/fa'
import { MdTableRestaurant, MdRoomService } from 'react-icons/md'

type CellType = 'empty' | 'pc' | 'desk2' | 'desk3x5' | 'reception' | 'wall'
type Cell = { type: CellType; stamp?: string; w?: number; h?: number; head?: boolean }

const rows = 10
const cols = 24
const wallCol = 12
const STORAGE_KEY = 'layout-grid-v1'

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid, rows, cols, wallCol }))
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
        </div>
      </header>
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

      <div
        className="builder-grid"
        onMouseLeave={() => setIsDragging(false)}
        onMouseUp={() => setIsDragging(false)}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(16px, 1fr))` }}
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
