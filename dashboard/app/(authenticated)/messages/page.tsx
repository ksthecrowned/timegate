'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import { FormField, Input, SelectSearch, Textarea } from '@/components/ui/FormField'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import { listEmployees } from '@/lib/timegate/employees'
import {
  createConversation,
  listConversations,
  type ConversationSummary,
} from '@/lib/timegate/messages'
import { employeeDisplayName } from '@/lib/timegate/employee-display'

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MessagesPage() {
  const [rows, setRows] = useState<ConversationSummary[]>([])
  const [employees, setEmployees] = useState<Array<{ value: string; label: string }>>([])
  const [employeeId, setEmployeeId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listConversations({ page: 1, limit: 50 })
      setRows(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    void listEmployees({ page: 1, limit: 100 }).then((res) =>
      setEmployees(
        res.data.map((e) => ({
          value: e.id,
          label: employeeDisplayName(e),
        })),
      ),
    )
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!employeeId || !subject.trim() || !body.trim()) {
      setError('Employé, sujet et message sont requis')
      return
    }
    setCreating(true)
    try {
      await createConversation({
        employeeId,
        subject: subject.trim(),
        body: body.trim(),
      })
      setSubject('')
      setBody('')
      setEmployeeId('')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Envoi impossible')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: 'Messages' }]} />
      <p className="text-sm text-gray-500 dark:text-neutral-400">
        Messagerie légère avec les employés (notifications push + in-app).
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid gap-4 rounded-xl border p-4 md:grid-cols-2 dark:border-neutral-700"
      >
        <FormField label="Employé" required>
          <SelectSearch
            instanceId="message-employee"
            options={employees}
            value={findOption(employees, employeeId)}
            onChange={(opt) => setEmployeeId(opt?.value ?? '')}
            required
          />
        </FormField>
        <FormField label="Sujet" required>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="Sujet du message"
            required
          />
        </FormField>
        <FormField label="Message" required>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Votre message…"
            required
          />
        </FormField>
        <div className="flex items-end md:col-span-1">
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? 'Envoi…' : 'Nouveau message'}
          </button>
        </div>
      </form>

      <DataTable<ConversationSummary>
        data={rows}
        loading={loading}
        emptyMessage="Aucune conversation"
        columns={[
          {
            key: 'employee',
            label: 'Employé',
            render: (_v, row) => employeeDisplayName(row.employee),
          },
          {
            key: 'subject',
            label: 'Sujet',
            render: (_v, row) => (
              <span className={row.unread ? 'font-semibold' : undefined}>
                {row.subject}
                {row.unread ? (
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-teal-600 align-middle" />
                ) : null}
              </span>
            ),
          },
          {
            key: 'lastMessagePreview',
            label: 'Aperçu',
            render: (_v, row) => row.lastMessagePreview ?? '—',
          },
          {
            key: 'lastMessageAt',
            label: 'Dernier message',
            render: (_v, row) => formatWhen(row.lastMessageAt),
          },
        ]}
        actions={(row) => <ActionButtons viewHref={`/messages/${row.id}`} />}
      />
    </div>
  )
}
