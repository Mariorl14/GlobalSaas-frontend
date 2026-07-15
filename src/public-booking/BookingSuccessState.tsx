export function BookingSuccessState({
  appointmentId,
  businessName,
  onBookAnother,
}: {
  appointmentId: string;
  businessName: string;
  onBookAnother: () => void;
}) {
  return (
    <div className="pb-success-wrap pb-root">
      <div className="pb-success-card">
        <div className="pb-success-icon" aria-hidden>
          ✓
        </div>
        <h2 className="pb-success-title">¡Listo, reserva confirmada!</h2>
        <p className="pb-success-text">
          Gracias por confiar en <strong style={{ color: "#0f172a" }}>{businessName}</strong>.
          Te esperamos en el horario elegido.
        </p>
        <p className="pb-success-ref">
          Guarda tu referencia por si necesitas contactar a la barbería:
          <br />
          <code>{appointmentId}</code>
        </p>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={onBookAnother}>
          Hacer otra reserva
        </button>
      </div>
    </div>
  );
}
