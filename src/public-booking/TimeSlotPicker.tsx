import type { Slot } from "./bookingApi";
import { timeFromIso } from "./formatters";

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
      <div className="pb-slots-loading">
        <span className="pb-spinner" aria-hidden />
        Buscando horarios disponibles…
      </div>
    );
  }
  if (!slots || slots.length === 0) {
    return (
      <p className="pb-slots-empty">
        No hay horarios libres este día. Prueba otra fecha o cambia de profesional.
      </p>
    );
  }
  return (
    <div className="pb-slot-grid">
      {slots.map((s, i) => {
        if (!s || !s.start) return null;
        const selected = value === s.start;
        return (
          <div
            key={`${s.start}-${i}`}
            className={selected ? "pb-slot-btn pb-slot-btn--selected" : "pb-slot-btn"}
            onClick={() => onChange(s.start)}
          >
            {timeFromIso(s.start)}
          </div>
        );
      })}
    </div>
  );
}
