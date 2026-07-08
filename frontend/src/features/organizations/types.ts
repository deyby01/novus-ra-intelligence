export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  plan: string
}

export type MembershipRole = 'admin' | 'manager' | 'operator'

export interface Membership {
  id: string
  role: MembershipRole
  organization: OrganizationSummary
}
