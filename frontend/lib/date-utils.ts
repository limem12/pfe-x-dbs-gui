export function parseIsoDate(
  value: string | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toLocalDateTime(
  value: string | null | undefined,
  locale?: string,
): string {
  const date = parseIsoDate(value);

  if (!date) {
    return '-';
  }

  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function toLocalDate(
  value: string | null | undefined,
  locale?: string,
): string {
  const date = parseIsoDate(value);

  if (!date) {
    return '-';
  }

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function toLocalTime(
  value: string | null | undefined,
  locale?: string,
): string {
  const date = parseIsoDate(value);

  if (!date) {
    return '';
  }

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function toLocalDateKey(
  value: string | null | undefined,
): string {
  const date = parseIsoDate(value);

  if (!date) {
    return '';
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
