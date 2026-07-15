import type { PublicBarber } from "./bookingApi";

export function BarberSelector({
  barbers,
  allowAny,
  value,
  onChange,
  disabled,
}: {
  barbers: PublicBarber[];
  allowAny: boolean;
  value: string;
  onChange: (employeeId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="pb-field-block">
      <label className="pb-field-label" htmlFor="pb-barber-select">
        Profesional
      </label>
      <div className="pb-select-wrap">
        <select
          id="pb-barber-select"
          className="pb-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {allowAny ? (
            <option value="">Cualquier profesional disponible</option>
          ) : null}
          {barbers.map((b) => (
            <option key={b.employee_id} value={b.employee_id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <p className="pb-field-hint">
        {allowAny && !value
          ? "Asignaremos automáticamente a quien tenga hueco en el horario elegido."
          : value
            ? "Solo verás horarios libres de esta persona."
            : "Elige quién te atenderá para filtrar la agenda."}
      </p>
    </div>
  );
}
