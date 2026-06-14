'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { bulkCreateEmployees, type EmployeePayload } from '@/lib/timegate/employees'
import {
  csvRowsToEmployeePayloads,
  employeeCsvTemplate,
  parseEmployeeCsv,
  type ParsedEmployeeCsvRow,
} from '@/lib/timegate/csv-import'
import { HttpError } from '@/lib/http'

export default function ImportEmployeesPage() {
  const router = useRouter()
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedEmployeeCsvRow[]>([])
  const [parseError, setParseError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkCreateEmployees>> | null>(null)

  const preview = useMemo(() => rows.slice(0, 5), [rows])

  const onFileChange = async (file: File | null) => {
    setParseError('')
    setResult(null)
    if (!file) {
      setFileName('')
      setRows([])
      return
    }
    setFileName(file.name)
    try {
      const text = await file.text()
      const parsed = parseEmployeeCsv(text)
      if (parsed.length === 0) {
        setParseError('Le fichier CSV est vide ou invalide.')
        setRows([])
        return
      }
      setRows(parsed)
    } catch {
      setParseError('Impossible de lire le fichier CSV.')
      setRows([])
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([employeeCsvTemplate()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'modele-employes.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async () => {
    setSubmitError('')
    setResult(null)
    setLoading(true)
    try {
      const payloads = csvRowsToEmployeePayloads(rows) as EmployeePayload[]
      const response = await bulkCreateEmployees(payloads)
      setResult(response)
      if (response.created > 0 && response.failed === 0) {
        setTimeout(() => router.push('/employees'), 1500)
      }
    } catch (err) {
      setSubmitError(err instanceof HttpError ? err.message : 'Import impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Employés', href: '/employees' },
          { label: 'Import CSV' },
        ]}
        action={
          <Link href="/employees" className={secondaryBtnClass}>
            Retour à la liste
          </Link>
        }
      />

      <FormCard title="Importer des employés">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Colonnes minimales : <code className="text-primary">firstName</code>,{' '}
          <code className="text-primary">lastName</code>,{' '}
          <code className="text-primary">branchId</code>. Les identifiants de branche,
          département, poste, etc. doivent exister dans TimeGate.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <button type="button" onClick={downloadTemplate} className={secondaryBtnClass}>
            Télécharger le modèle CSV
          </button>
          <label className={`${secondaryBtnClass} cursor-pointer`}>
            Choisir un fichier
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {fileName && (
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
            Fichier : <span className="font-medium">{fileName}</span> — {rows.length} ligne(s)
          </p>
        )}

        {parseError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {parseError}
          </div>
        )}

        {preview.length > 0 && (
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-border-dark">
                  <th className="p-2 text-start text-slate-500">Prénom</th>
                  <th className="p-2 text-start text-slate-500">Nom</th>
                  <th className="p-2 text-start text-slate-500">Branche</th>
                  <th className="p-2 text-start text-slate-500">Email</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-border-dark/50">
                    <td className="p-2">{row.firstName ?? '—'}</td>
                    <td className="p-2">{row.lastName ?? '—'}</td>
                    <td className="p-2">{row.branchId ?? '—'}</td>
                    <td className="p-2">{row.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="text-xs text-slate-500 mt-2">Aperçu des 5 premières lignes sur {rows.length}.</p>
            )}
          </div>
        )}

        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {submitError}
          </div>
        )}

        {result && (
          <div className="mb-4 p-4 tg-card border border-slate-200/80 dark:border-border-dark space-y-2">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {result.created} créé(s), {result.failed} erreur(s)
            </p>
            {result.errors.length > 0 && (
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                {result.errors.map((error) => (
                  <li key={`${error.row}-${error.message}`}>
                    Ligne {error.row} : {error.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={rows.length === 0 || loading}
          onClick={() => void onImport()}
          className={primaryBtnClass}
        >
          {loading ? 'Import en cours…' : `Importer ${rows.length} employé(s)`}
        </button>
      </FormCard>
    </div>
  )
}
