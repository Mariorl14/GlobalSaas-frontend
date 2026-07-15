import type { PublicBusiness, PublicService, PublicBarber, Slot } from "./bookingApi";
import type { CustomerFormValues } from "./CustomerBookingForm";

export function BookingSummary({
  business,
  service,
  barber,
  slot,
  customer,
  onConfirm,
  onBack,
  submitting,
}: {
  business: PublicBusiness;
  service: PublicService | null;
  barber: PublicBarber | null;
  slot: Slot | null;
  customer: CustomerFormValues;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const dateLine = slot
    ? new Date(slot.start).toLocaleDateString("es", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";
  const timeLine = slot
    ? `${new Date(slot.start).toLocaleTimeString("es", {
        hour: "2-digit",
        minute: "2-digit",
      })} – ${new Date(slot.end).toLocaleTimeString("es", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "—";

  return (
    <div className="pb-summary">
      <h3 className="pb-summary-title">Revisa y confirma</h3>

      <div className="pb-summary-inner">
        <div className="pb-summary-block">
          <div className="pb-summary-label">Barbería</div>
          <div className="pb-summary-value">{business.name}</div>
        </div>

        <div className="pb-summary-block">
          <div className="pb-summary-label">Servicio</div>
          <div className="pb-summary-value">
            {service?.name ?? "—"}
            {service ? (
              <span className="pb-summary-value--muted" style={{ display: "block", marginTop: "0.25rem" }}>
                {service.duration} min · ${service.price.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="pb-summary-block">
          <div className="pb-summary-label">Profesional</div>
          <div className="pb-summary-value">
            {barber ? barber.label : "Cualquier profesional disponible"}
          </div>
        </div>

        <div className="pb-summary-block">
          <div className="pb-summary-label">Fecha y hora</div>
          <div className="pb-summary-datetime" style={{ textTransform: "capitalize" }}>
            {dateLine}
          </div>
          <div className="pb-summary-value" style={{ marginTop: "0.35rem" }}>
            {timeLine}
          </div>
        </div>

        <div className="pb-summary-block">
          <div className="pb-summary-label">Tus datos</div>
          <div className="pb-summary-value">
            {customer.first_name} {customer.last_name}
            <div className="pb-summary-value--muted" style={{ marginTop: "0.35rem" }}>
              {customer.phone}
              {customer.email ? (
                <>
                  <br />
                  {customer.email}
                </>
              ) : null}
            </div>
          </div>
        </div>

        {customer.notes ? (
          <div className="pb-summary-block">
            <div className="pb-summary-label">Notas</div>
            <div className="pb-summary-value pb-summary-value--muted">{customer.notes}</div>
          </div>
        ) : null}
      </div>

      <div className="pb-actions pb-summary-actions">
        <button type="button" className="pb-btn pb-btn-secondary" onClick={onBack} disabled={submitting}>
          Atrás
        </button>
        <button
          type="button"
          className="pb-btn pb-btn-primary"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? "Confirmando…" : "Confirmar reserva"}
        </button>
      </div>
    </div>
  );
}
