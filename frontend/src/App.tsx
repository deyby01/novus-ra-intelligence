import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Novus RA Intelligence
        </h1>
        <p className="text-muted-foreground">
          Frontend scaffold ready — React, Vite, TypeScript, Tailwind &
          shadcn/ui.
        </p>
      </div>
      <Button>Get started</Button>
    </main>
  )
}

export default App
