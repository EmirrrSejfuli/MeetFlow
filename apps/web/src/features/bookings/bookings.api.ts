
export interface Booking {
  id: string
  slotId: string
  guestName: string
  guestEmail: string
  createdAt: string
}

export interface CreateBookingInput {
  slotId: string
  guestName: string
  guestEmail: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function createBooking(
  input: CreateBookingInput,
): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (response.status === 409) {
    const body: unknown = await response.json().catch(() => null)

    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      body.message ===
        'The host is busy in Google Calendar at this time.'
    ) {
      throw new Error(
        'The host is unavailable at this time due to a Google Calendar conflict. Please choose another slot.',
      )
    }

    throw new Error(
      'This time slot has already been booked. Please choose another time.',
    )
  }

  if (response.status === 400) {
    throw new Error(
      'Invalid booking details. Please check your information.',
    )
  }

  if (response.status === 404) {
    throw new Error(
      'The selected time slot is no longer available.',
    )
  }

  if (!response.ok) {
    throw new Error(
      'Unable to complete your booking. Please try again.',
    )
  }

  return (await response.json()) as Booking
}
