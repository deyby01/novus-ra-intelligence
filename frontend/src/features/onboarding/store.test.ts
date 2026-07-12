import { beforeEach, describe, expect, it } from 'vitest'
import { useOnboardingStore } from './store'

describe('onboarding store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset()
  })

  it('starts with both tours unseen', () => {
    expect(useOnboardingStore.getState().hasSeenHomeTour).toBe(false)
    expect(useOnboardingStore.getState().hasSeenOverviewTour).toBe(false)
  })

  it('marks the home tour seen without touching the overview tour', () => {
    useOnboardingStore.getState().markHomeSeen()

    expect(useOnboardingStore.getState().hasSeenHomeTour).toBe(true)
    expect(useOnboardingStore.getState().hasSeenOverviewTour).toBe(false)
  })

  it('marks the overview tour seen without touching the home tour', () => {
    useOnboardingStore.getState().markOverviewSeen()

    expect(useOnboardingStore.getState().hasSeenOverviewTour).toBe(true)
    expect(useOnboardingStore.getState().hasSeenHomeTour).toBe(false)
  })

  it('reset clears both flags', () => {
    useOnboardingStore.getState().markHomeSeen()
    useOnboardingStore.getState().markOverviewSeen()

    useOnboardingStore.getState().reset()

    expect(useOnboardingStore.getState().hasSeenHomeTour).toBe(false)
    expect(useOnboardingStore.getState().hasSeenOverviewTour).toBe(false)
  })
})
