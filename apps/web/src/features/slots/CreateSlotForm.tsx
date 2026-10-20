
import { useState, type FormEvent } from 'react'
import { DateTime } from 'luxon'

import { createSlot } from './slots.api'

interface CreateSlotFormProps {
  onCreated: () => void
}

const TIME_ZONE = 'Europe/Skopje'

export function CreateSlotForm({
  onCreated,
}: CreateSlotFormProps) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
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
      await createSlot({
        startsAt: utcStart,
        durationMinutes,
      })

      setDate('')
      setStartTime('')
      setSuccess(true)

      onCreated()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <span className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Host Dashboard
        </span>

        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Create Availability
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Publish a new time slot for your guests.
          Times use the Europe/Skopje time zone.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label
              htmlFor="slot-date"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Date
            </label>

            <input
              id="slot-date"
              type="date"
              required
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="slot-time"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Start Time
            </label>

            <input
              id="slot-time"
              type="time"
              required
              value={startTime}
              onChange={(event) =>
                setStartTime(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="slot-duration"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Duration
            </label>

            <select
              id="slot-duration"
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            Time slot created successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-7 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Time Slot'}
        </button>
      </form>
    </section>
  )
}
