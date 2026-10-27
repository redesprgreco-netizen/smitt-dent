const TIME_ZONE = 'America/Mexico_City'
const MINUTES_PER_APPOINTMENT = 60
const BUFFER_MINUTES = 5
const SLOT_STEP_MINUTES = 15
const MAX_DAYS_AHEAD = 30

export function getMexicoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function getMexicoMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]))
  return values.hour * 60 + values.minute
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function getPublicDateRange(now = new Date()) {
  const start = getMexicoDateKey(now)
  const endDate = new Date(`${start}T00:00:00.000Z`)
  endDate.setUTCDate(endDate.getUTCDate() + MAX_DAYS_AHEAD)
  return { start, end: endDate.toISOString().slice(0, 10) }
}

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function getAvailableTimes(
  dateKey: string,
  busyTimes: Date[],
  now = new Date(),
) {
  if (!isValidDateKey(dateKey)) return []

  const date = new Date(`${dateKey}T00:00:00.000Z`)
  const day = date.getUTCDay()
  if (day === 0) return []

  const opening = 9 * 60
  const closing = (day === 6 ? 14 : 18) * 60
  const lastStart = closing - MINUTES_PER_APPOINTMENT
  const todayKey = getMexicoDateKey(now)
  const nowMinutes = dateKey === todayKey ? getMexicoMinutes(now) : -1
  const bookedMinutes = busyTimes.map(time => {
    const utc = time.toISOString()
    return Number(utc.slice(11, 13)) * 60 + Number(utc.slice(14, 16))
  })

  const times: string[] = []
  for (let start = opening; start <= lastStart; start += SLOT_STEP_MINUTES) {
    if (start <= nowMinutes) continue
    const available = bookedMinutes.every(booked =>
      Math.abs(start - booked) >= MINUTES_PER_APPOINTMENT + BUFFER_MINUTES
    )
    if (available) times.push(formatTime(start))
  }
  return times
}

export function isRequestableDate(dateKey: string, now = new Date()) {
  if (!isValidDateKey(dateKey)) return false
  const { start, end } = getPublicDateRange(now)
  return dateKey >= start && dateKey <= end
}
