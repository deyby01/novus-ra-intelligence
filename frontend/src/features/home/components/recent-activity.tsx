import { useRecentActivity } from '@/features/activity/hooks'
import type { ActivityVerb } from '@/features/activity/types'
import { relativeTime } from '../utils'

const RECENT_LIMIT = 5

// Each verb reads as a first-person sentence with the target rendered in bold.
const VERB_PHRASES: Record<ActivityVerb, string> = {
  DATASET_IMPORTED: 'Importaste ',
  REPORT_GENERATED: 'La IA generó un reporte de ',
  DASHBOARD_CREATED: 'Creaste el dashboard ',
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-g200 mt-3 rounded-2xl border bg-white px-5 py-[18px]">
      {children}
    </div>
  )
}

/** Block 7 — the workspace's real activity, newest first, as a timeline. */
export function RecentActivity() {
  const { data: events, isPending, isError } = useRecentActivity(RECENT_LIMIT)

  return (
    <div>
      <h3 className="font-display text-g900 text-[17px] font-semibold">
        Actividad reciente
      </h3>

      {isPending && (
        <Panel>
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((key) => (
              <div key={key} className="space-y-1.5">
                <div className="bg-g100 h-3 w-3/4 animate-pulse rounded" />
                <div className="bg-g100 h-2.5 w-1/4 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {isError && (
        <Panel>
          <p className="text-g500 py-4 text-center text-[13px]">
            No pudimos cargar la actividad.
          </p>
        </Panel>
      )}

      {events?.length === 0 && (
        <Panel>
          <p className="text-g500 py-4 text-center text-[13px]">
            Aún no hay actividad. Importa un Excel para empezar.
          </p>
        </Panel>
      )}

      {events && events.length > 0 && (
        <Panel>
          <div className="border-g150 flex flex-col gap-4 border-l-2 pl-[17px]">
            {events.map((event, i) => (
              <div key={event.id} className="relative">
                <span
                  className={`absolute -left-[22px] top-1 size-[9px] rounded-full border-2 border-white ${
                    i === 0 ? 'bg-g900' : 'bg-g300'
                  }`}
                />
                <p className="text-g700 text-[13px] leading-snug">
                  {VERB_PHRASES[event.verb]}
                  <span className="font-display text-g900 font-semibold">
                    {event.target_label}
                  </span>
                </p>
                <p className="text-g400 mt-0.5 text-[11px]">
                  {relativeTime(event.created_at)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
