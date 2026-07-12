import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  hasSeenHomeTour: boolean
  hasSeenOverviewTour: boolean
  markHomeSeen: () => void
  markOverviewSeen: () => void
  reset: () => void
}

/**
 * Onboarding store. Tracks whether the guided tour has run on each surface —
 * the Home hub and the dataset Overview — as independent flags so each scene
 * fires exactly once and neither suppresses the other. Persisted to
 * localStorage so a returning user isn't re-toured.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenHomeTour: false,
      hasSeenOverviewTour: false,
      markHomeSeen: () => set({ hasSeenHomeTour: true }),
      markOverviewSeen: () => set({ hasSeenOverviewTour: true }),
      reset: () => set({ hasSeenHomeTour: false, hasSeenOverviewTour: false }),
    }),
    {
      name: 'novus-onboarding',
    },
  ),
)
