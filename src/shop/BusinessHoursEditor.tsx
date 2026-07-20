import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
  type WeeklySchedule,
} from "./businessHours";

export function BusinessHoursEditor({
  value,
  onChange,
  disabled,
}: {
  value: WeeklySchedule;
  onChange: (next: WeeklySchedule) => void;
  disabled?: boolean;
}) {
  const setDay = (key: DayKey, patch: Partial<WeeklySchedule[DayKey]>) => {
    onChange({
      ...value,
      [key]: { ...value[key], ...patch },
    });
  };

  const applyWeekdays = () => {
    const src = value.mon;
    const next = { ...value };
    for (const key of ["mon", "tue", "wed", "thu", "fri"] as DayKey[]) {
      next[key] = { ...src };
    }
    onChange(next);
  };

  return (
    <div className="bp-hours-editor">
      <div className="bp-hours-editor__toolbar">
        <p className="bp-hint" style={{ margin: 0 }}>
          Define a qué hora abre y cierra cada día. Los huecos de la reserva pública usan este horario.
        </p>
        {disabled ? null : (
          <button type="button" className="bp-btn bp-btn--ghost bp-btn--sm" onClick={applyWeekdays}>
            Copiar lunes a Lun–Vie
          </button>
        )}
      </div>

      <div className="bp-hours-editor__list" role="list">
        {DAY_KEYS.map((key) => {
          const day = value[key];
          return (
            <div className="bp-hours-editor__row" role="listitem" key={key}>
              <label className="bp-hours-editor__day">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={day.open}
                  onChange={(e) => setDay(key, { open: e.target.checked })}
                />
                <span>{DAY_LABELS[key]}</span>
              </label>

              {day.open ? (
                <div className="bp-hours-editor__times">
                  <input
                    className="bp-input"
                    type="time"
                    disabled={disabled}
                    value={day.openTime}
                    onChange={(e) => setDay(key, { openTime: e.target.value })}
                    aria-label={`${DAY_LABELS[key]} apertura`}
                  />
                  <span className="bp-hours-editor__sep">a</span>
                  <input
                    className="bp-input"
                    type="time"
                    disabled={disabled}
                    value={day.closeTime}
                    onChange={(e) => setDay(key, { closeTime: e.target.value })}
                    aria-label={`${DAY_LABELS[key]} cierre`}
                  />
                </div>
              ) : (
                <span className="bp-hours-editor__closed">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
