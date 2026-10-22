
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

  return (
    <section
      className="mt-14"
      aria-labelledby="slots-title"
    >
      <div className="mb-6">
        <h2
          id="slots-title"
          className="text-2xl font-bold text-slate-900"
        >
          Available Time Slots
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Choose a convenient time to book your meeting.
          All times are shown in the Skopje time zone.
        </p>
      </div>

      {confirmedBooking && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
              ✓
            </div>

            <div>
              <h3 className="text-lg font-bold text-emerald-900">
                Booking Confirmed!
              </h3>

              <p className="text-xs text-emerald-700">
                Your reservation was saved successfully.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-emerald-100 bg-white p-5">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {confirmedBooking.confirmationMessage}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isGeneratingConfirmation ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                <span
                  className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
                  aria-hidden="true"
                />
                Preparing your personalized AI message...
              </span>
            ) : confirmedBooking.confirmationSource ===
              'gemini' ? (
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
        <p role="status" className="text-slate-500">
          Loading available slots...
        </p>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
        >
          {error}
        </div>
      )}

      {!loading && !error && slots.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">
            No available slots at the moment.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Please check again later.
          </p>
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => {
            const start = new Date(slot.startsAt)

            const end = new Date(
              start.getTime() +
                slot.durationMinutes * 60_000,
            )

            const isSelected =
              selectedSlotId === slot.id
            const isAvailable = slot.available

            return (
              <article
                key={slot.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </span>

                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    {slot.durationMinutes} min
                  </span>
                </div>

                <p className="font-semibold text-slate-900">
                  {dateFormatter.format(start)}
                </p>

                <p className="mt-2 text-lg font-medium text-slate-700">
                  <time dateTime={slot.startsAt}>
                    {timeFormatter.format(start)}
                  </time>

                  {' – '}

                  {timeFormatter.format(end)}
                </p>

                {!isAvailable && (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    {slot.unavailableReason === 'calendar-unavailable'
                      ? 'Calendar availability cannot be verified right now.'
                      : 'The host is busy in Google Calendar at this time.'}
                  </p>
                )}

                {!isSelected && isAvailable && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectSlot(slot.id)
                    }
                    aria-label={`Book meeting on ${dateFormatter.format(start)} at ${timeFormatter.format(start)}`}
                    className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Book This Slot
                  </button>
                )}

                {isSelected && isAvailable && (
                  <BookingForm
                    slotId={slot.id}
                    onBooked={handleBookingSuccess}
                    onCancel={() =>
                      setSelectedSlotId(null)
                    }
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
