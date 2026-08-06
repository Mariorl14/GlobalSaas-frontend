/** Payment methods: DB stores lowercase; UI shows Cash / SINPE / Card. */

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "sinpe", label: "SINPE" },
  { value: "card", label: "Card" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export function payLabel(method: string | null | undefined): string {
  if (method == null || method === "") return "Not recorded";
  const m = method.toLowerCase();
  if (m === "cash") return "Cash";
  if (m === "sinpe") return "SINPE";
  if (m === "card") return "Card";
  if (m === "transfer") return "Transfer (legacy)";
  if (m === "other") return "Other (legacy)";
  return method;
}

export function payBadgeClass(method: string | null | undefined): string {
  if (method == null || method === "") return "bp-badge--neutral";
  const m = method.toLowerCase();
  if (m === "cash") return "bp-badge--success";
  if (m === "sinpe") return "bp-badge--primary";
  if (m === "card") return "bp-badge--info";
  return "bp-badge--neutral";
}
