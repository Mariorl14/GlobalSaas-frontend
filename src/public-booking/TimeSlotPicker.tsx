import type { Slot } from "./bookingApi";

export function TimeSlotPicker({
  slots,
  value,
  onChange,
  loading,
}: {
  slots: Slot[];
  value: string;
  onChange: (startIso: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="pb-slots-loading" role="status" aria-live="polite">
        <span className="pb-spinner" aria-hidden />
        Buscando horarios disponibles…
      </div>
    );
  }
  if (slots.length === 0) {
    return (
      <p className="pb-slots-empty">
        No hay horarios libres este día. Prueba otra fecha o cambia de profesional.
      </p>
    );
  }
  return (
    <div className="pb-slot-grid" role="listbox" aria-label="Horarios disponibles">
      {slots.map((s) => {
        const t = new Date(s.start);
        const label = t.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
        const sel = value === s.start;
        return (
          <button
            key={s.start}
            type="button"
            role="option"
            aria-selected={sel}
            className={`pb-slot-btn${sel ? " pb-slot-btn--selected" : ""}`}
            onClick={() => onChange(s.start)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
