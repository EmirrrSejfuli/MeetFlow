
export interface TimeSlot {
  id: string
  startsAt: string
  durationMinutes: number
  createdAt: string
}

export interface CreateSlotInput {
  startsAt: string
  durationMinutes: number
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function getAvailableSlots(
  signal?: AbortSignal,
): Promise<TimeSlot[]> {
  const response = await fetch(`${API_BASE_URL}/slots`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(
      'Unable to load available slots. Please try again.',
    )
  }

  return (await response.json()) as TimeSlot[]
}

export async function createSlot(
  input: CreateSlotInput,
): Promise<TimeSlot> {
  const response = await fetch(`${API_BASE_URL}/slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (response.status === 409) {
    throw new Error(
      'This time slot overlaps with an existing slot. Please choose another time.',
    )
  }

  if (response.status === 400) {
    throw new Error(
      'Invalid date, time, or duration. Please check your details.',
    )
  }

  if (!response.ok) {
    throw new Error(
      'Unable to create the time slot. Please try again.',
    )
  }

  return (await response.json()) as TimeSlot
}
