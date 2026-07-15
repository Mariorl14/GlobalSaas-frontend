const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function BookingCalendar({
  year,
  month,
  selectedDate,
  onSelectDate,
  dayHints,
  minDate,
  todayIso,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  dayHints: Record<string, boolean>;
  minDate: string;
  todayIso: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="pb-datetime-cal">
      <div className="pb-cal-header">
        <button
          type="button"
          className="pb-cal-nav"
          onClick={onPrevMonth}
          aria-label="Mes anterior"
        >
          ←
        </button>
        <span className="pb-cal-title">
          {first.toLocaleString("es", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          className="pb-cal-nav"
          onClick={onNextMonth}
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>
      <div className="pb-cal-weekdays">
        {dayNames.map((n) => (
          <div key={n} className="pb-cal-weekday">
            {n}
          </div>
        ))}
      </div>
      <div className="pb-cal-grid">
        {cells.map((d, i) => {
          if (d === null) {
            return <div key={`e-${i}`} />;
          }
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isPast = iso < minDate;
          const has = dayHints[iso];
          const isSel = selectedDate === iso;
          const isToday = iso === todayIso;
          const cls = [
            "pb-cal-day",
            has && !isPast ? "pb-cal-day--available" : "",
            isSel ? "pb-cal-day--selected" : "",
            isToday && !isSel ? "pb-cal-day--today" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              className={cls}
              onClick={() => onSelectDate(iso)}
              aria-label={`Elegir ${iso}`}
              aria-pressed={isSel}
            >
              {d}
              {has && !isPast ? <span className="pb-cal-dot" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <div className="pb-cal-legend">
        <span>
          <span className="pb-legend-dot" aria-hidden />
          Días con horarios libres
        </span>
        <span>Borde violeta = hoy</span>
      </div>
    </div>
  );
}
