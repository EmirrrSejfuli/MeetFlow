
import { useState, type FormEvent } from 'react'

import { createBooking } from './bookings.api'

interface BookingFormProps {
  slotId: string
  onBooked: () => void
  onCancel: () => void
}

export function BookingForm({
  slotId,
  onBooked,
  onCancel,
}: BookingFormProps) {
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting) return

    setError(null)

    const name = guestName.trim()
    const email = guestEmail.trim().toLowerCase()

    if (!name || !email) {
      setError('Name and email are required.')
      return
    }

    setSubmitting(true)

    try {
      await createBooking({
        slotId,
        guestName: name,
        guestEmail: email,
      })

      onBooked()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mt-5 space-y-4 border-t border-slate-200 pt-5"
    >
      <div>
        <label
          htmlFor={`guest-name-${slotId}`}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Full Name
        </label>

        <input
          id={`guest-name-${slotId}`}
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
          placeholder="Enter your full name"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label
          htmlFor={`guest-email-${slotId}`}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Email Address
        </label>

        <input
          id={`guest-email-${slotId}`}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
          placeholder="name@example.com"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Booking...' : 'Confirm Booking'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
