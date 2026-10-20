
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
    throw new Error('Failed to load available slots.')
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

  if (!response.ok) {
    throw new Error(
      `Failed to create time slot (HTTP ${response.status}).`,
    )
  }

  return (await response.json()) as TimeSlot
}
