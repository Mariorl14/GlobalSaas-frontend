import type { Slot } from "./bookingApi";

function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

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
        const sel = value === s.start;
        return (
          <button
            key={s.start}
            type="button"
            role="option"
            aria-selected={sel}
            className={`pb-slot-btn${sel ? " pb-slot-btn--selected" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(s.start)}
          >
            {formatSlotLabel(s.start)}
          </button>
        );
      })}
    </div>
  );
}
