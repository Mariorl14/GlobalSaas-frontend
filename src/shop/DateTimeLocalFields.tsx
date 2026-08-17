import { joinDateTimeLocal, splitDateTimeLocal } from "../public-booking/formatters";
import { TimeSelect12h } from "./TimeSelect12h";

type Props = {
  dateId?: string;
  timeId?: string;
  value: string;
  onChange: (dateTimeLocal: string) => void;
  dateLabel?: string;
  timeLabel?: string;
  disabled?: boolean;
};

/** Date + 12h time picker; stores `YYYY-MM-DDTHH:mm` like datetime-local. */
export function DateTimeLocalFields({
  dateId,
  timeId,
  value,
  onChange,
  dateLabel = "Fecha",
  timeLabel = "Hora",
  disabled,
}: Props) {
  const { date, time } = splitDateTimeLocal(value);
  return (
    <div className="bp-field__row">
      <div className="bp-field">
        <label className="bp-label" htmlFor={dateId}>
          {dateLabel}
        </label>
        <input
          id={dateId}
          className="bp-input"
          type="date"
          disabled={disabled}
          value={date}
          onChange={(e) => onChange(joinDateTimeLocal(e.target.value, time))}
        />
      </div>
      <div className="bp-field">
        <label className="bp-label" htmlFor={timeId}>
          {timeLabel}
        </label>
        <TimeSelect12h
          id={timeId}
          value={time}
          disabled={disabled}
          onChange={(hhmm) => onChange(joinDateTimeLocal(date, hhmm))}
        />
      </div>
    </div>
  );
}
