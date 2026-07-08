import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useImportExcel, useImportJob } from '../hooks'

const EXCEL_EXTENSIONS = ['.xlsx', '.xls']

function hasExcelExtension(fileName: string): boolean {
  return EXCEL_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext))
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

export function ImportDatasetPage() {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  const importExcel = useImportExcel()
  const { data: job } = useImportJob(jobId)

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setValidationError(null)
    if (selected && !name) {
      setName(baseName(selected.name))
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setValidationError('Give the dataset a name.')
      return
    }
    if (!file) {
      setValidationError('Choose an Excel file to import.')
      return
    }
    if (!hasExcelExtension(file.name)) {
      setValidationError('The file must be an Excel workbook (.xlsx or .xls).')
      return
    }
    setValidationError(null)
    importExcel.mutate(
      { name: name.trim(), file },
      { onSuccess: (created) => setJobId(created.id) },
    )
  }

  const reset = () => {
    setJobId(null)
    importExcel.reset()
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Datasets
      </Link>

      {job?.status === 'done' ? (
        <ResultCard
          icon={<CheckCircle2 className="size-6 text-emerald-600" />}
          title="Import complete"
          detail={`${job.rows_processed} ${job.rows_processed === 1 ? 'row' : 'rows'} imported into “${name}”.`}
        >
          <Button asChild>
            <Link to="/">View datasets</Link>
          </Button>
        </ResultCard>
      ) : job?.status === 'error' ? (
        <ResultCard
          icon={<AlertCircle className="text-destructive size-6" />}
          title="Import failed"
          detail={
            job.errors.detail ??
            'The file could not be imported. Check that it is a valid Excel workbook.'
          }
        >
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </ResultCard>
      ) : jobId || importExcel.isPending ? (
        <ResultCard
          icon={
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          }
          title="Importing your spreadsheet"
          detail="Detecting columns and loading rows. This can take a moment for large files."
        />
      ) : (
        <div className="rounded-xl border p-6">
          <div className="flex items-center gap-3">
            <span className="bg-muted grid size-10 place-items-center rounded-lg border">
              <FileSpreadsheet className="text-muted-foreground size-5" />
            </span>
            <div>
              <h1 className="font-semibold tracking-tight">
                Import a spreadsheet
              </h1>
              <p className="text-muted-foreground text-sm">
                Turn an Excel file into a dataset.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="dataset-name">Dataset name</Label>
              <Input
                id="dataset-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Q3 Sales"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-file">Excel file</Label>
              <label
                htmlFor="dataset-file"
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 transition-colors"
              >
                <Upload className="text-muted-foreground size-5 shrink-0" />
                <span className="min-w-0 text-sm">
                  {file ? (
                    <span className="truncate font-medium">{file.name}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Choose a .xlsx or .xls file
                    </span>
                  )}
                </span>
                <input
                  id="dataset-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={onFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            {(validationError || importExcel.isError) && (
              <p className="text-destructive text-sm">
                {validationError ??
                  'Something went wrong starting the import. Please try again.'}
              </p>
            )}

            <Button type="submit" className="w-full">
              Import
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

interface ResultCardProps {
  icon: ReactNode
  title: string
  detail: string
  children?: ReactNode
}

function ResultCard({ icon, title, detail, children }: ResultCardProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border px-6 py-14 text-center">
      <div className="bg-muted grid size-12 place-items-center rounded-xl border">
        {icon}
      </div>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground max-w-sm text-sm">{detail}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
