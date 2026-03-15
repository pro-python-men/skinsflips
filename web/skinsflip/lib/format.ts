export function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

export function formatPercent(value: number, digits = 1) {
  const numberValue = Number(value) || 0;
  return `${numberValue.toFixed(digits)}%`;
}

export function formatShortDate(value: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

