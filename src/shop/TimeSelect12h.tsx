import { dayTimeOptions, normalizeBookingHhmm } from "../public-booking/formatters";

type Props = {
  id?: string;
  value: string;
  onChange: (hhmm: string) => void;
  className?: string;
  "aria-label"?: string;
  disabled?: boolean;
  placeholder?: string;
};

/** 12-hour time select on the shop booking minute grid. Value is always "HH:mm" (24h). */
export function TimeSelect12h({
  id,
  value,
  onChange,
  className = "bp-select",
  "aria-label": ariaLabel,
  disabled,
  placeholder = "Selecciona la hora",
}: Props) {
  const normalized = normalizeBookingHhmm(value);
  const options = dayTimeOptions();
  const known = options.some((o) => o.value === normalized);
  return (
    <select
      id={id}
      className={className}
      value={known ? normalized : ""}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {!known && value ? (
        <option value={normalizeBookingHhmm(value) || value}>{value}</option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
