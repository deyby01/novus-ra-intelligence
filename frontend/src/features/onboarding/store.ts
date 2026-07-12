import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  hasSeenTour: boolean
  markSeen: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenTour: false,
      markSeen: () => set({ hasSeenTour: true }),
      reset: () => set({ hasSeenTour: false }),
    }),
    {
      name: 'novus-onboarding',
    },
  ),
)
