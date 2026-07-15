interface ActivityEvent {
  text: string
  bold: string
  tail?: string
  meta: string
}

// Sample data (README) — no activity backend yet; swap once available.
const events: ActivityEvent[] = [
  { text: 'Importaste ', bold: 'Ventas Q3.xlsx', meta: 'hace 2 h' },
  {
    text: 'La IA generó un overview de ',
    bold: 'Inventario',
    meta: 'hace 5 h',
  },
  { text: 'Creaste el dashboard ', bold: 'Finanzas', meta: 'ayer' },
  { text: 'Agregaste 42 filas a ', bold: 'Leads Web', meta: 'ayer' },
]

/** Block 7 — vertical activity timeline. */
export function RecentActivity() {
  return (
    <div>
      <h3 className="font-display text-g900 text-[17px] font-semibold">
        Actividad reciente
      </h3>

      <div className="border-g200 mt-3 rounded-2xl border bg-white px-5 py-[18px]">
        <div className="border-g150 flex flex-col gap-4 border-l-2 pl-[17px]">
          {events.map((event, i) => (
            <div key={i} className="relative">
              <span
                className={`absolute -left-[22px] top-1 size-[9px] rounded-full border-2 border-white ${
                  i === 0 ? 'bg-g900' : 'bg-g300'
                }`}
              />
              <p className="text-g700 text-[13px] leading-snug">
                {event.text}
                <span className="font-display text-g900 font-semibold">
                  {event.bold}
                </span>
                {event.tail}
              </p>
              <p className="text-g400 mt-0.5 text-[11px]">{event.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
