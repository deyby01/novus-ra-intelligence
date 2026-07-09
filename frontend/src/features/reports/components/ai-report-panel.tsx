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

  // We simply pick the latest report, assuming the list endpoint returns them ordered by created_at DESC or we sort them.
  // The backend currently returns all reports, so we grab the last one added (or the one with the largest id/date).
  const latestReport = reports && reports.length > 0 
    ? [...reports].sort((a: Report, b: Report) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
    : null

  const handleGenerate = () => {
    create.mutate({ dataset: datasetId })
  }

  if (isReportsPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-800/60 p-4 border rounded-xl border-blue-100 bg-blue-50/30">
        <Loader2 className="size-4 animate-spin" />
        Checking for insights...
      </div>
    )
  }

  if (!latestReport) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <Sparkles className="size-5 text-blue-600" />
            AI-Powered Insights
          </h3>
          <p className="text-sm text-blue-700/80 mt-1 max-w-lg">
            Let our AI analyze this dataset and uncover hidden patterns, statistical summaries, and actionable business intelligence.
          </p>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={create.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
        >
          {create.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
          Generate Insights
        </Button>
      </div>
    )
  }

  return <ReportView reportId={latestReport.id} onRegenerate={handleGenerate} isCreating={create.isPending} />
}

function ReportView({ reportId, onRegenerate, isCreating }: { reportId: string, onRegenerate: () => void, isCreating: boolean }) {
  // Poll every 3 seconds if status is PENDING
  const { data: report } = useReport(reportId, {
    refetchInterval: (query: any) => (query.state.data?.status === 'PENDING' ? 3000 : false),
  })

  if (!report) return null

  if (report.status === 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-blue-100 bg-blue-50/50 text-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20"></div>
          <div className="relative flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm border border-blue-200">
            <Sparkles className="size-6 animate-pulse" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-blue-900">Analyzing your data...</h3>
        <p className="mt-2 text-sm text-blue-700/70 max-w-md">
          Our AI is crunching the numbers and looking for meaningful patterns. This usually takes around 10-15 seconds depending on the dataset size.
        </p>
      </div>
    )
  }

  if (report.status === 'FAILED') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-5 text-red-600" />
          Analysis Failed
        </div>
        <p className="mt-2 text-sm text-red-700">We encountered an issue while analyzing this dataset:</p>
        <div className="mt-3 rounded-lg bg-red-100/50 p-3 text-xs font-mono text-red-800 border border-red-200/50">
          {report.error_message}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onRegenerate} variant="outline" className="border-red-200 hover:bg-red-100 text-red-700" disabled={isCreating}>
            {isCreating ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50/50 to-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">AI Analysis Report</h3>
        </div>
        <Button 
          onClick={onRegenerate} 
          variant="outline" 
          size="sm" 
          className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="size-4 mr-2 animate-spin" /> : "Refresh Insights"}
        </Button>
      </div>
      
      <div className="p-6 md:p-8 overflow-auto max-h-[600px] prose prose-blue prose-sm sm:prose-base max-w-none text-slate-700">
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </div>
      
      <div className="border-t border-blue-100 bg-slate-50 px-6 py-3 text-xs text-slate-500 flex justify-between items-center">
        <span>Generated on {new Date(report.created_at).toLocaleString()}</span>
        <span>Novus RA Intelligence</span>
      </div>
    </div>
  )
}
