import { useState, type FormEvent } from 'react'

import { createBooking } from './bookings.api'

type BookingResult = Awaited<ReturnType<typeof createBooking>>

interface BookingFormProps {
  slotId: string
  onBooked: (booking: BookingResult) => void
  onCancel: () => void
}

export function BookingForm({ slotId, onBooked, onCancel }: BookingFormProps) {
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
      const booking = await createBooking({
        slotId,
        guestName: name,
        guestEmail: email,
      })
      onBooked(booking)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4 border-t border-indigo-100 pt-5">
      <div>
        <label htmlFor={`guest-name-${slotId}`} className="block text-xs font-semibold text-slate-700">Full name</label>
        <input
          id={`guest-name-${slotId}`}
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
          placeholder="Your name"
          className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label htmlFor={`guest-email-${slotId}`} className="block text-xs font-semibold text-slate-700">Email address</label>
        <input
          id={`guest-email-${slotId}`}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Booking...' : 'Confirm booking'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
