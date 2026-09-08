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
  const showGrid = slots.length > 0;
  if (loading && !showGrid) {
    return (
      <div className="pb-slots-loading">
        <span className="pb-spinner" aria-hidden />
        Buscando horarios disponibles…
      </div>
    );
  }
  if (!showGrid) {
    return (
      <p className="pb-slots-empty">
        No hay horarios libres este día. Prueba otra fecha o cambia de profesional.
      </p>
    );
  }
  return (
    <div>
      {loading ? (
        <div className="pb-slots-loading">
          <span className="pb-spinner" aria-hidden />
          Actualizando horarios…
        </div>
      ) : null}
      <div className={loading ? "pb-slot-grid pb-slot-grid--busy" : "pb-slot-grid"}>
        {slots.map((s, i) => {
          if (!s || !s.start) return null;
          const selected = value === s.start;
          return (
            <div
              key={`${s.start}-${i}`}
              className={selected ? "pb-slot-btn pb-slot-btn--selected" : "pb-slot-btn"}
              translate="no"
              onClick={() => onChange(s.start)}
            >
              <span translate="no">{timeFromIso(s.start)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
