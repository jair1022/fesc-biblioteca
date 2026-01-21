import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

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
      return normalizeGrid(
        parsed.grid.map((row) =>
          row.map((cell) => ({
            type: cell.type,
            stamp: cell.stamp,
            w: cell.w,
            h: cell.h,
            head: cell.head,
          })),
        ),
      )
    }
    return buildFallbackGrid()
  } catch {
    return buildFallbackGrid()
  }
}

const normalizeGrid = (grid: Cell[][]): Cell[][] => {
  const stampMap = new Map<string, { type: CellType; coords: { r: number; c: number }[] }>()
  grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (!cell.stamp) return
      if (!stampMap.has(cell.stamp)) {
        stampMap.set(cell.stamp, { type: cell.type, coords: [] })
      }
      stampMap.get(cell.stamp)!.coords.push({ r, c })
    }),
  )

  const next = grid.map((row) => row.map((cell) => ({ ...cell, head: false })))

  stampMap.forEach((info, stamp) => {
    let minR = Infinity
    let minC = Infinity
    let maxR = -Infinity
    let maxC = -Infinity
    info.coords.forEach(({ r, c }) => {
      minR = Math.min(minR, r)
      minC = Math.min(minC, c)
      maxR = Math.max(maxR, r)
      maxC = Math.max(maxC, c)
    })
    const width = maxC - minC + 1
    const height = maxR - minR + 1
    info.coords.forEach(({ r, c }) => {
      next[r][c] = { ...next[r][c], type: info.type, stamp, w: width, h: height, head: r === minR && c === minC }
    })
  })

  return next
}

const splitRooms = (grid: Cell[][]) => {
  const left = grid.map((row) => row.slice(0, wallCol))
  const right = grid.map((row) => row.slice(wallCol + 1))
  return [
    { name: 'Sala 1', layout: left },
    { name: 'Sala 2', layout: right },
  ]
}

const Hero = () => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768)
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const rooms = splitRooms(loadGrid())

  return (
    <section className="hero">
      <div className="hero__grid">
        <div className="hero__content hero__content--stacked hero__content-col">
          <p className="eyebrow">FESC • Laboratorio de Cómputo</p>
          <h1>Reserva de computadores en línea</h1>
          <p className="lead">
            Elige un equipo disponible en tiempo real. Acceso con correo @fesc.edu.co y panel
            administrativo para gestionar salas.
          </p>
          <div className="actions">
            <Link to="/login" className="btn primary">
              Iniciar sesión
            </Link>
            <Link to="/reservas" className="btn ghost">
              Ver disponibilidad
            </Link>
          </div>
        </div>
        <div className="hero__visual">
          <div className="screen">
            <div className="screen__header">
              <span className="screen__label">Mapa de equipos</span>
              <div className="legend">
                <span className="dot free" /> Disponible
                <span className="dot busy muted" /> Bloque
              </div>
            </div>
            <div className="mini-rooms">
              {rooms.map((room) => {
                const colsRoom = room.layout[0]?.length || 1
                return (
                  <div key={room.name} className="mini-room">
                    <div className="mini-room__title">{room.name}</div>
                    <div
                      className="mini-room__grid preview-grid"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(colsRoom, windowWidth < 768 ? 6 : colsRoom)}, ${windowWidth < 768 ? '11px' : '12px'})`,
                        gridAutoRows: windowWidth < 768 ? '11px' : '12px',
                      }}
                    >
                      {room.layout.flatMap((row, rIdx) =>
                        row.map((cell, cIdx) => {
                          if (cell.stamp && !cell.head) return null
                          const cls =
                            cell.type === 'wall'
                              ? 'mini-cell wall'
                              : cell.type === 'pc'
                                ? 'mini-cell pc'
                                : cell.type === 'desk2' || cell.type === 'desk3x5'
                                  ? 'mini-cell desk'
                                  : cell.type === 'reception'
                                    ? 'mini-cell reception'
                                    : 'mini-cell empty'
                          const style: React.CSSProperties = {
                            gridRowStart: rIdx + 1,
                            gridColumnStart: cIdx + 1,
                          }
                          if (cell.head && cell.w && cell.h) {
                            style.gridRowEnd = `span ${cell.h}`
                            style.gridColumnEnd = `span ${cell.w}`
                          }
                          return <div key={`${rIdx}-${cIdx}`} className={cls} style={style} />
                        }),
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
