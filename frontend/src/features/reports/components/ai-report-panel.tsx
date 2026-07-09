import { Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { useReport, useReports, useReportMutations } from '../hooks'
import type { Report } from '../types'

interface AiReportPanelProps {
  datasetId: string
}

export function AiReportPanel({ datasetId }: AiReportPanelProps) {
  const { data: reports, isPending: isReportsPending } = useReports(datasetId)
  const { create } = useReportMutations(datasetId)

  // Surface the most recent report; the list is ordered newest-first server-side.
  const latestReport =
    reports && reports.length > 0
      ? [...reports].sort(
          (a: Report, b: Report) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0]
      : null

  const handleGenerate = () => {
    create.mutate({ dataset: datasetId })
  }

  if (isReportsPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-xl bg-muted/30">
        <Loader2 className="size-4 animate-spin" />
        Checking for insights...
      </div>
    )
  }

  if (!latestReport) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            AI-Powered Insights
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Let our AI analyze this dataset and uncover hidden patterns,
            statistical summaries, and actionable business intelligence.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={create.isPending}>
          {create.isPending ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="size-4 mr-2" />
          )}
          Generate Insights
        </Button>
      </div>
    )
  }

  return (
    <ReportView
      reportId={latestReport.id}
      onRegenerate={handleGenerate}
      isCreating={create.isPending}
    />
  )
}

function ReportView({
  reportId,
  onRegenerate,
  isCreating,
}: {
  reportId: string
  onRegenerate: () => void
  isCreating: boolean
}) {
  // Poll every 3 seconds while the report is still PENDING.
  const { data: report } = useReport(reportId, {
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 3000 : false,
  })

  if (!report) return null

  if (report.status === 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border bg-muted/50 text-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20"></div>
          <div className="relative flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm border border-primary/20">
            <Sparkles className="size-6 animate-pulse" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-foreground">
          Analyzing your data...
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Our AI is crunching the numbers and looking for meaningful patterns.
          This usually takes around 10-15 seconds depending on the dataset size.
        </p>
      </div>
    )
  }

  if (report.status === 'FAILED') {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-5 text-destructive" />
          Analysis Failed
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          We encountered an issue while analyzing this dataset:
        </p>
        <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs font-mono text-destructive border border-destructive/20">
          {report.error_message}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={onRegenerate}
            variant="outline"
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Analysis Report</h3>
        </div>
        <Button
          onClick={onRegenerate}
          variant="outline"
          size="sm"
          className="h-8"
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            'Refresh Insights'
          )}
        </Button>
      </div>

      <div className="p-6 md:p-8 overflow-auto max-h-[600px] prose prose-sm sm:prose-base max-w-none text-foreground">
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </div>

      <div className="border-t bg-muted/30 px-6 py-3 text-xs text-muted-foreground flex justify-between items-center">
        <span>Generated on {new Date(report.created_at).toLocaleString()}</span>
        <span>Novus RA Intelligence</span>
      </div>
    </div>
  )
}
