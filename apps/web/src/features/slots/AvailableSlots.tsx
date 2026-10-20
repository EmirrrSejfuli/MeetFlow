
import { useEffect, useState } from 'react'

import { BookingForm } from '../bookings/BookingForm'
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

  const [bookingSuccess, setBookingSuccess] = useState(false)
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

  function handleBookingSuccess(bookedSlotId: string) {
    setSlots((current) =>
      current.filter((slot) => slot.id !== bookedSlotId),
    )

    setSelectedSlotId(null)
    setBookingSuccess(true)

    // Refresh to synchronize with the server.
    setRefreshCount((current) => current + 1)
  }

  function handleSelectSlot(slotId: string) {
    setSelectedSlotId((current) =>
      current === slotId ? null : slotId,
    )

    setBookingSuccess(false)
  }

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

      {bookingSuccess && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <h3 className="font-semibold text-emerald-800">
            Booking Confirmed!
          </h3>

          <p className="mt-2 text-sm text-emerald-700">
            Your meeting has been successfully booked.
            Thank you for choosing MeetFlow!
          </p>
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

            const isSelected = selectedSlotId === slot.id

            return (
              <article
                key={slot.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Available
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

                {!isSelected && (
                  <button
                    type="button"
                    onClick={() => handleSelectSlot(slot.id)}
                    aria-label={`Book meeting on ${dateFormatter.format(start)} at ${timeFormatter.format(start)}`}
                    className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Book This Slot
                  </button>
                )}

                {isSelected && (
                  <BookingForm
                    slotId={slot.id}
                    onBooked={() =>
                      handleBookingSuccess(slot.id)
                    }
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
