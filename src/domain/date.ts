export function getSystemTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta'
}

export function formatDateInTimeZone(date: Date, timezone: string) {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = dateParts(date, timezone)
  } catch {
    parts = dateParts(date, getSystemTimeZone())
  }
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function dateParts(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
}
