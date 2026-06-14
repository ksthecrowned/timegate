#!/usr/bin/env node
/** Génère les pages CRUD TimeGate — exécuter une fois depuis dashboard */
import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'app/dashboard')

function write(file, content) {
  const full = path.join(root, file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content.trimStart() + '\n')
}

const namedEntity = (slug, label, singular, api, type) => {
  const base = `/dashboard/${slug}`
  write(
    `${slug}/page.tsx`,
    `'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { delete${type}, list${type}s } from '@/lib/timegate/${slug}'
import type { ${type} } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<${type}>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'id', label: 'Identifiant' },
  {
    key: 'createdAt',
    label: 'Créé le',
    render: (v) => (v ? new Date(String(v)).toLocaleDateString('fr-FR') : '—'),
  },
]

export default function ${type}sPage() {
  const [data, setData] = useState<${type}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await list${type}s({ page: 1, limit: 100 })
      setData(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '${label}' }]}
        action={<AddPageLink href="${base}/new" label="Ajouter" />}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          entityLabel="${label.toLowerCase()}"
          tableId="hs-${slug}-table"
          emptyMessage="Aucun élément trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={\`${base}/\${row.id}\`}
              editHref={\`${base}/\${row.id}/edit\`}
              onDelete={() => { void delete${type}(row.id).then(load) }}
            />
          )}
        />
      )}
    </div>
  )
}
`,
  )

  write(
    `${slug}/new/page.tsx`,
    `'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { create${type} } from '@/lib/timegate/${slug}'

export default function New${type}Page() {
  const router = useRouter()
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: '${label}', href: '${base}' }, { label: 'Ajouter' }]} />
      <NamedEntityForm
        title="${singular}"
        submitLabel="Créer"
        onCancel={() => router.push('${base}')}
        onSubmit={async (values) => {
          const row = await create${type}(values)
          router.push(\`${base}/\${row.id}\`)
        }}
      />
    </div>
  )
}
`,
  )

  write(
    `${slug}/[id]/page.tsx`,
    `'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { delete${type}, get${type} } from '@/lib/timegate/${slug}'
import type { ${type} } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function ${type}DetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<${type} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await get${type}(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '${label}', href: '${base}' }, { label: row?.name ?? 'Détail' }]}
        action={row && (
          <div className="flex gap-2">
            <Link href={\`${base}/\${id}/edit\`} className={primaryBtnClass}>Modifier</Link>
            <ActionButtons onDelete={() => { void delete${type}(id).then(() => router.push('${base}')) }} />
          </div>
        )}
      />
      <ApiErrorBanner message={error} />
      {loading ? <p className="text-sm text-gray-500">Chargement…</p> : row ? (
        <DetailCard title={row.name}>
          <DetailRow label="Identifiant" value={row.id} />
          <DetailRow label="Nom" value={row.name} />
          <DetailRow label="Créé le" value={new Date(row.createdAt).toLocaleString('fr-FR')} />
        </DetailCard>
      ) : null}
    </div>
  )
}
`,
  )

  write(
    `${slug}/[id]/edit/page.tsx`,
    `'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { get${type}, update${type} } from '@/lib/timegate/${slug}'
import type { ${type} } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function Edit${type}Page() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<${type} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void get${type}(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: '${label}', href: '${base}' }, { label: row?.name ?? '…', href: \`${base}/\${id}\` }, { label: 'Modifier' }]} />
      <ApiErrorBanner message={error} />
      {loading ? <p className="text-sm text-gray-500">Chargement…</p> : row ? (
        <NamedEntityForm
          title="${singular}"
          submitLabel="Enregistrer"
          initial={{ name: row.name }}
          onCancel={() => router.push(\`${base}/\${id}\`)}
          onSubmit={async (values) => {
            await update${type}(id, values)
            router.push(\`${base}/\${id}\`)
          }}
        />
      ) : null}
    </div>
  )
}
`,
  )
}

namedEntity('departments', 'Départements', 'Département', 'departments', 'Department')
namedEntity('designations', 'Postes', 'Poste', 'designations', 'Designation')

console.log('Generated departments + designations pages')
