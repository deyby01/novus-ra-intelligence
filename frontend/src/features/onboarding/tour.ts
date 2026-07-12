import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useOnboardingStore } from './store'

export function runTour(path: string) {
  const isHome = path === '/'
  const isOverview =
    path.startsWith('/datasets/') &&
    path !== '/datasets/import' &&
    path !== '/datasets'

  if (isHome) {
    const driverObj = driver({
      showProgress: true,
      steps: [
        {
          element: '[data-tour="import"]',
          popover: {
            title: 'Welcome!',
            description:
              'Start by importing your own Excel file to turn it into a live dataset.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="sample"]',
          popover: {
            title: 'Or try a sample',
            description:
              'Click here to instantly load a sample dataset and see the overview in action.',
            side: 'top',
            align: 'center',
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy()
      },
    })
    driverObj.drive()
  } else if (isOverview) {
    const driverObj = driver({
      showProgress: true,
      steps: [
        {
          element: '[data-tour="kpis"]',
          popover: {
            title: 'Instant Metrics',
            description:
              'We automatically calculate key performance indicators from your data.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '[data-tour="ai-insights"]',
          popover: {
            title: 'AI Insights',
            description:
              'Generate comprehensive reports and deep dives with one click.',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '[data-tour="data-tab"]',
          popover: {
            title: 'Raw Data',
            description:
              'Switch to this tab to view, edit, and manage your raw dataset rows.',
            side: 'bottom',
            align: 'start',
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy()
        useOnboardingStore.getState().markSeen()
      },
    })
    driverObj.drive()
  }
}
