
import { useEffect, useState } from 'react'

import { BookingForm } from '../bookings/BookingForm'
import {
  generateBookingConfirmation,
  type Booking,
} from '../bookings/bookings.api'

import {
  getAvailableSlots,
  type TimeSlot,
} from './slots.api'

const TIME_ZONE = 'Europe/Skopje'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
})

export function AvailableSlots() {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSlotId, setSelectedSlotId] = useState<
    string | null
  >(null)

  const [confirmedBooking, setConfirmedBooking] =
    useState<Booking | null>(null)

  const [generatingForId, setGeneratingForId] =
    useState<string | null>(null)

  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSlots() {
      try {
        const data = await getAvailableSlots(controller.signal)

        if (!controller.signal.aborted) {
          setSlots(data)
          setError(null)
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Could not load available slots.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadSlots()

    return () => controller.abort()
  }, [refreshCount])

  function handleBookingSuccess(booking: Booking) {
    // Remove the booked slot from the available list.
    setSlots((current) =>
      current.filter(
        (slot) => slot.id !== booking.slotId,
      ),
    )

    setSelectedSlotId(null)

    // Show the standard confirmation immediately.
    setConfirmedBooking(booking)

    // Begin AI personalization separately.
    setGeneratingForId(booking.id)

    void generateBookingConfirmation(booking.id, booking.confirmationToken)
      .then((confirmation) => {
        // Update only the booking currently displayed.
        setConfirmedBooking((current) => {
          if (!current || current.id !== booking.id) {
            return current
          }

          return {
            ...current,
            ...confirmation,
          }
        })
      })
      .catch(() => {
        // Keep the standard confirmation if AI fails.
        // The booking has already been saved.
      })
      .finally(() => {
        setGeneratingForId((current) =>
          current === booking.id ? null : current,
        )
      })

    // Refresh available slots from the server.
    setRefreshCount((current) => current + 1)
  }

  function handleSelectSlot(slotId: string) {
    setSelectedSlotId((current) =>
      current === slotId ? null : slotId,
    )

    setConfirmedBooking(null)
  }

  const isGeneratingConfirmation =
    confirmedBooking !== null &&
    generatingForId === confirmedBooking.id

  const availableCount = slots.filter((slot) => slot.available).length

  return (
    <section
      id="availability-panel"
      className="min-w-0 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_-23px_rgba(15,23,42,0.21)] sm:p-7"
      aria-labelledby="slots-title"
    >
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M7.5 3v4M16.5 3v4M3 10h18M8 15l2.5 2.5L16 13" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Guest booking</p>
            <h2 id="slots-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Available time slots</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Select an open time and confirm your meeting.</p>
          </div>
        </div>
        {!loading && !error && (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {availableCount} open
          </span>
        )}
      </div>

      {confirmedBooking && (
        <div role="status" aria-live="polite" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white" aria-hidden="true">✓</div>
            <div>
              <h3 className="font-bold text-emerald-950">Booking confirmed!</h3>
              <p className="mt-0.5 text-xs text-emerald-700">Your reservation was saved successfully.</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line rounded-xl border border-emerald-100 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
            {confirmedBooking.confirmationMessage}
          </p>
          <div className="mt-4">
            {isGeneratingConfirmation ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true" />
                Preparing your personalized AI message...
              </span>
            ) : confirmedBooking.confirmationSource === 'gemini' ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <span aria-hidden="true">✦</span>
                Personalized with Gemini AI
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Standard booking confirmation
              </span>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div role="status" className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-8 text-sm text-slate-500">
          Loading available slots...
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && slots.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="font-semibold text-slate-800">No available slots yet</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">New meeting times will appear here when they are added.</p>
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {slots.map((slot) => {
            const start = new Date(slot.startsAt)
            const end = new Date(start.getTime() + slot.durationMinutes * 60_000)
            const isSelected = selectedSlotId === slot.id
            const isAvailable = slot.available

            return (
              <article
                key={slot.id}
                className={`min-w-0 rounded-2xl border p-5 transition-all ${
                  isAvailable
                    ? 'border-indigo-100 bg-white shadow-[0_7px_24px_-17px_rgba(67,56,202,0.45)] hover:border-indigo-200 hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.11em] ${isAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-hidden="true" />
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">{slot.durationMinutes} min</span>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-700">{dateFormatter.format(start)}</p>
                  <p className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
                    <time dateTime={slot.startsAt}>{timeFormatter.format(start)}</time>
                    <span className="mx-1.5 font-normal text-slate-300">–</span>
                    {timeFormatter.format(end)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Europe / Skopje</p>
                </div>

                {!isAvailable && (
                  <p className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 font-medium text-amber-800">
                    {slot.unavailableReason === 'calendar-unavailable'
                      ? 'Calendar availability cannot be verified right now.'
                      : 'The host is busy in Google Calendar at this time.'}
                  </p>
                )}

                {!isSelected && isAvailable && (
                  <button
                    type="button"
                    onClick={() => handleSelectSlot(slot.id)}
                    aria-label={`Book meeting on ${dateFormatter.format(start)} at ${timeFormatter.format(start)}`}
                    className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_-11px_rgba(79,70,229,0.7)] transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Book this time <span aria-hidden="true">→</span>
                  </button>
                )}

                {isSelected && isAvailable && (
                  <BookingForm
                    slotId={slot.id}
                    onBooked={handleBookingSuccess}
                    onCancel={() => setSelectedSlotId(null)}
                  />
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
