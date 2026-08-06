import { PAYMENT_METHODS, type PaymentMethodValue } from "./paymentMethods";

type Props = {
  value: string;
  onChange: (value: PaymentMethodValue | "") => void;
  /** Force native select (e.g. inside a tight dialog). */
  forceSelect?: boolean;
  required?: boolean;
  id?: string;
  label?: string;
};

/**
 * Cash / SINPE / Card picker.
 * Segmented buttons on desktop; native select on narrow screens (or forceSelect).
 */
export function PaymentMethodField({
  value,
  onChange,
  forceSelect = false,
  required = true,
  id = "payment-method",
  label = "Método de pago",
}: Props) {
  const select = (
    <select
      id={id}
      className="bp-select bp-pay-field__select"
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value as PaymentMethodValue | "")}
    >
      <option value="">Seleccionar…</option>
      {PAYMENT_METHODS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );

  if (forceSelect) {
    return (
      <div className="bp-field">
        <label className="bp-label" htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </label>
        {select}
      </div>
    );
  }

  return (
    <div className="bp-field bp-pay-field">
      <label className="bp-label" htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </label>
      <div className="bp-pay-seg" role="group" aria-label={label}>
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            className={
              value === m.value
                ? "bp-pay-seg__opt bp-pay-seg__opt--active"
                : "bp-pay-seg__opt"
            }
            onClick={() => onChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {select}
    </div>
  );
}
