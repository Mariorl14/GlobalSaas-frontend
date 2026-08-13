/** Costa Rican colones — shared money formatting for shop + booking UI. */

const LOCALE = "es-CR";
const CURRENCY = "CRC";

export function formatMoney(
  n: number | null | undefined,
  opts?: { exact?: boolean },
): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const exact = Boolean(opts?.exact);
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: exact ? 2 : 0,
    minimumFractionDigits: exact ? 2 : 0,
  }).format(Number(n));
}

/** Alias used by insights / sales KPIs (whole colones). */
export function money(n: number | null | undefined): string {
  return formatMoney(n);
}

/** Line items / tickets (two decimals). */
export function moneyExact(n: number | null | undefined): string {
  return formatMoney(n, { exact: true });
}
