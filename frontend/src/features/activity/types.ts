export type ActivityVerb =
  'DATASET_IMPORTED' | 'REPORT_GENERATED' | 'DASHBOARD_CREATED'

export interface ActivityEvent {
  id: string
  verb: ActivityVerb
  /** The kind of object the event is about, e.g. 'dataset' | 'dashboard'. */
  target_type: string
  /** The object's id, so the feed can link to it if it still exists. */
  target_id: string | null
  /** The object's name captured when the event was recorded. */
  target_label: string
  /** The member who caused it; null for a system/anonymized event. */
  actor_email: string | null
  created_at: string
}
