import { Sparkles, AlertCircle, Loader2, FileDown, Mail } from 'lucide-react'
import { useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { useReport, useReports, useReportMutations } from '../hooks'
import type { Report } from '../types'

interface AiReportPanelProps {
  datasetId: string
  datasetName?: string
}

export function AiReportPanel({ datasetId, datasetName }: AiReportPanelProps) {
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
      datasetName={datasetName}
      onRegenerate={handleGenerate}
      isCreating={create.isPending}
    />
  )
}

/**
 * Print the rendered report in isolation from the app chrome.
 *
 * Opens a blank window, writes a self-contained HTML document containing only
 * the report body plus a clean print stylesheet, and triggers the browser's
 * print / "Save as PDF" dialog. Returns false when the popup was blocked.
 */
function printReport(
  bodyHtml: string,
  title: string,
  generatedOn: string,
): boolean {
  const printWindow = window.open('', '_blank', 'width=820,height=1000')
  if (!printWindow) return false

  const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const doc = printWindow.document
  doc.open()
  doc.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 2cm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1a1a1a;
    line-height: 1.6;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
  }
  header { border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 24px; }
  header h1 { font-size: 22px; margin: 0 0 4px; }
  header p { margin: 0; font-size: 12px; color: #555; }
  h1, h2, h3 { font-family: Helvetica, Arial, sans-serif; line-height: 1.3; }
  h2 { font-size: 17px; margin: 24px 0 8px; }
  h3 { font-size: 14px; margin: 18px 0 6px; }
  p, li { font-size: 13px; }
  ul, ol { padding-left: 20px; }
  strong { font-weight: 700; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f2f2f2; }
  code { font-family: "Courier New", monospace; font-size: 12px; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; color: #777; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <p>Generated on ${escapeHtml(generatedOn)}</p>
</header>
<main>${bodyHtml}</main>
<footer>Novus RA Intelligence</footer>
</body>
</html>`)
  doc.close()
  printWindow.focus()

  // Print once the document is ready; the timeout covers browsers that have
  // already fired `load` by the time this runs. A flag keeps it to one call.
  let printed = false
  const triggerPrint = () => {
    if (printed) return
    printed = true
    printWindow.print()
  }
  printWindow.onload = triggerPrint
  window.setTimeout(triggerPrint, 300)

  return true
}

function ReportView({
  reportId,
  datasetName,
  onRegenerate,
  isCreating,
}: {
  reportId: string
  datasetName?: string
  onRegenerate: () => void
  isCreating: boolean
}) {
  const reportBodyRef = useRef<HTMLDivElement>(null)

  // Poll every 3 seconds while the report is still PENDING.
  const { data: report } = useReport(reportId, {
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 3000 : false,
  })

  const handleExportPdf = () => {
    const body = reportBodyRef.current
    if (!body || !report) return
    const title = datasetName
      ? `${datasetName} — AI Analysis Report`
      : 'AI Analysis Report'
    const generatedOn = new Date(report.created_at).toLocaleString()
    const ok = printReport(body.innerHTML, title, generatedOn)
    if (!ok) {
      window.alert(
        'Please allow pop-ups for this site to export the report as a PDF.',
      )
    }
  }

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
      <div className="border-b bg-muted/30 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Analysis Report</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onRegenerate}
            variant="outline"
            size="sm"
            className="h-8"
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : null}
            Refresh Insights
          </Button>
          <Button
            onClick={handleExportPdf}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <FileDown className="size-3.5 mr-1.5" />
            Export PDF
          </Button>
          <span title="Email delivery is coming soon" className="inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled
              title="Email delivery is coming soon"
              aria-label="Email report (coming soon)"
            >
              <Mail className="size-3.5 mr-1.5" />
              Email
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                Soon
              </span>
            </Button>
          </span>
        </div>
      </div>

      <div
        ref={reportBodyRef}
        className="p-6 md:p-8 overflow-auto max-h-[600px] prose prose-sm sm:prose-base max-w-none text-foreground"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {report.content}
        </ReactMarkdown>
      </div>

      <div className="border-t bg-muted/30 px-6 py-3 text-xs text-muted-foreground flex justify-between items-center">
        <span>Generated on {new Date(report.created_at).toLocaleString()}</span>
        <span>Novus RA Intelligence</span>
      </div>
    </div>
  )
}
