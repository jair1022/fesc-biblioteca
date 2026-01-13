const mockReservas = [
  { label: 'Sala Norte • Equipo 3', fecha: 'Hoy, 2:00 - 3:00 pm', estado: 'Activa' },
  { label: 'Sala Sur • Equipo 7', fecha: 'Mañana, 10:00 - 11:00 am', estado: 'Pendiente' },
  { label: 'Sala Norte • Equipo 15', fecha: 'Ayer, 4:00 - 5:00 pm', estado: 'Finalizada' },
]

const MisReservasPage = () => {
  return (
    <div className="page mis-reservas">
      <header className="section-head">
        <p className="eyebrow">Historial (visual)</p>
        <div>
          <h2>Mis reservas</h2>
          <p className="lead">Listado simulado de próximas y pasadas.</p>
        </div>
      </header>

      <div className="reservas-list">
        {mockReservas.map((item) => (
          <article key={item.label + item.fecha} className="card">
            <h3>{item.label}</h3>
            <p className="lead">{item.fecha}</p>
            <span className="badge">{item.estado}</span>
          </article>
        ))}
      </div>
    </div>
  )
}

export default MisReservasPage
