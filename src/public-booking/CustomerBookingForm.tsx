export type CustomerFormValues = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
};

export function CustomerBookingForm({
  value,
  onChange,
}: {
  value: CustomerFormValues;
  onChange: (v: CustomerFormValues) => void;
}) {
  return (
    <div>
      <p className="pb-field-hint" style={{ marginBottom: "1.25rem", maxWidth: "none" }}>
        Tus datos solo se usan para esta reserva y la gestión de tu cita en la barbería. Teléfono: mínimo 6
        caracteres; el email es opcional pero debe ser válido si lo indicas.
      </p>
      <div className="pb-form-grid-2">
        <div className="pb-field-block">
          <label className="pb-field-label" htmlFor="pb-fn">
            Nombre
          </label>
          <input
            id="pb-fn"
            className="pb-input"
            type="text"
            autoComplete="given-name"
            maxLength={80}
            value={value.first_name}
            onChange={(e) => onChange({ ...value, first_name: e.target.value })}
          />
        </div>
        <div className="pb-field-block">
          <label className="pb-field-label" htmlFor="pb-ln">
            Apellidos
          </label>
          <input
            id="pb-ln"
            className="pb-input"
            type="text"
            autoComplete="family-name"
            maxLength={80}
            value={value.last_name}
            onChange={(e) => onChange({ ...value, last_name: e.target.value })}
          />
        </div>
      </div>
      <div className="pb-field-block" style={{ marginTop: "1rem" }}>
        <label className="pb-field-label" htmlFor="pb-phone">
          Teléfono
        </label>
        <input
          id="pb-phone"
          className="pb-input"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={20}
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
      </div>
      <div className="pb-field-block" style={{ marginTop: "1rem" }}>
        <label className="pb-field-label" htmlFor="pb-email">
          Email <span style={{ fontWeight: 500, color: "#94a3b8" }}>(opcional)</span>
        </label>
        <input
          id="pb-email"
          className="pb-input"
          type="email"
          autoComplete="email"
          maxLength={120}
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </div>
      <div className="pb-field-block" style={{ marginTop: "1rem" }}>
        <label className="pb-field-label" htmlFor="pb-notes">
          Notas <span style={{ fontWeight: 500, color: "#94a3b8" }}>(opcional)</span>
        </label>
        <textarea
          id="pb-notes"
          className="pb-textarea"
          maxLength={4000}
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Alergias, preferencia de estilo, etc."
        />
      </div>
    </div>
  );
}
