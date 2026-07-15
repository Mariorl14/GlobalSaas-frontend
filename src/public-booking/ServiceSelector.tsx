import type { PublicService } from "./bookingApi";

export function ServiceSelector({
  services,
  value,
  onChange,
  disabled,
}: {
  services: PublicService[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="pb-field-block">
      <label className="pb-field-label" htmlFor="pb-service-select">
        Servicio
      </label>
      <div className="pb-select-wrap">
        <select
          id="pb-service-select"
          className="pb-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Selecciona un servicio</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration} min · ${s.price.toFixed(2)}
            </option>
          ))}
        </select>
      </div>
      <p className="pb-field-hint">
        El precio y la duración definen los huecos disponibles en la agenda.
      </p>
    </div>
  );
}
