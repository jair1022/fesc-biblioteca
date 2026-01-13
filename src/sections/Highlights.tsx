const highlights: { title: string; desc: string }[] = []

const Highlights = () => {
  return (
    <section className="highlights">
      {highlights.length === 0 && (
        <article className="highlight-card">
          <h3 className="highlight-title">Reserva de equipos</h3>
          <p className="highlight-desc">Ingresa con tu correo institucional y selecciona tu equipo.</p>
        </article>
      )}
    </section>
  )
}

export default Highlights
