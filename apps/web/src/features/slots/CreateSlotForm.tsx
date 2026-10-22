import { useState, type FormEvent } from 'react'
import { DateTime } from 'luxon'

import { createSlot } from './slots.api'

interface CreateSlotFormProps {
  onCreated: () => void
}

const TIME_ZONE = 'Europe/Skopje'
const inputClasses =
  'mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100'

export function CreateSlotForm({ onCreated }: CreateSlotFormProps) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setError(null)
    setSuccess(false)

    const localDateTime = `${date}T${startTime}`
    const startsAt = DateTime.fromISO(localDateTime, {
      zone: TIME_ZONE,
    })

    if (
      !startsAt.isValid ||
      startsAt.toFormat("yyyy-MM-dd'T'HH:mm") !== localDateTime
    ) {
      setError('Please select a valid date and time.')
      return
    }

    if (startsAt.toMillis() <= Date.now()) {
      setError('Please select a future date and time.')
      return
    }

    const utcStart = startsAt.toUTC().toISO()
    if (!utcStart) {
      setError('Could not process the selected time.')
      return
    }

    setSaving(true)
    try {
      await createSlot({ startsAt: utcStart, durationMinutes })
      setDate('')
      setStartTime('')
      setSuccess(true)
      onCreated()
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_-23px_rgba(15,23,42,0.21)] sm:p-7"
      aria-labelledby="create-slot-title"
    >
      <div className="mb-7 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M7.5 3v4M16.5 3v4M3 10h18M12 13v5M9.5 15.5h5" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Host workspace</p>
          <h2 id="create-slot-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Create availability
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Set a date and time that guests can book.
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <label htmlFor="slot-date" className="text-xs font-semibold text-slate-700">Date</label>
            <input
              id="slot-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="slot-time" className="text-xs font-semibold text-slate-700">Start time</label>
            <input
              id="slot-time"
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <label htmlFor="slot-duration" className="text-xs font-semibold text-slate-700">Meeting duration</label>
            <select
              id="slot-duration"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              className={inputClasses}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <span aria-hidden="true">◷</span>
          All times use the Europe/Skopje time zone.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            ✓ Time slot created successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-9px_rgba(79,70,229,0.7)] transition-all hover:bg-indigo-700 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Creating your slot...' : '+ Create time slot'}
        </button>
      </form>
    </section>
  )
}
