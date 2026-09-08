import { moneyExact } from "../money";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  servicePrice?: number | null;
};

const TIP_PATTERN = /^\d*[.,]?\d{0,2}$/;

/** Empty / blank → 0. Rejects negatives and non-numeric text. */
export function parseTipInput(raw: string): { ok: true; amount: number } | { ok: false; error: string } {
  const t = raw.trim().replace(",", ".");
  if (!t) return { ok: true, amount: 0 };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, error: "Propina inválida." };
  if (n < 0) return { ok: false, error: "La propina no puede ser negativa." };
  return { ok: true, amount: Math.round(n * 100) / 100 };
}

export function tipToInput(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return "";
  return String(amount);
}

/**
 * Compact optional tip field for appointment complete / edit.
 * Designed to sit under the existing payment-method picker.
 */
export function TipAmountField({
  value,
  onChange,
  id = "tip-amount",
  servicePrice,
}: Props) {
  const parsed = parseTipInput(value);
  const tip = parsed.ok ? parsed.amount : 0;
  const showTotal =
    servicePrice != null && Number.isFinite(servicePrice) && parsed.ok && tip > 0;

  return (
    <div className="bp-field">
      <label className="bp-label" htmlFor={id}>
        Propina{" "}
        <span className="bp-hint" style={{ fontWeight: 500 }}>
          (opcional)
        </span>
      </label>
      <input
        id={id}
        className="bp-input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        min={0}
        value={value}
        aria-label="Propina opcional"
        onChange={(e) => {
          const next = e.target.value;
          if (next === "") {
            onChange("");
            return;
          }
          if (next.startsWith("-")) return;
          if (!TIP_PATTERN.test(next)) return;
          onChange(next);
        }}
      />
      {servicePrice != null && Number.isFinite(servicePrice) ? (
        <p className="bp-hint" style={{ margin: 0 }}>
          Servicio {moneyExact(servicePrice)}
          {showTotal ? ` · Total ${moneyExact(servicePrice + tip)}` : ""}
        </p>
      ) : null}
    </div>
  );
}
