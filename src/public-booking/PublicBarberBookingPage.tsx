import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { mediaUrl } from "../mediaUrl";
import {
  fetchAvailability,
  fetchCalendarHints,
  fetchCustomerMe,
  fetchPublicBarbers,
  fetchPublicBusiness,
  fetchPublicServices,
  submitPublicBooking,
  type PublicBarber,
  type PublicBusiness,
  type PublicService,
  type Slot,
} from "./bookingApi";
import { BarberSelector } from "./BarberSelector";
import { BookingCalendar } from "./BookingCalendar";
import { BookingSuccessState } from "./BookingSuccessState";
import { BookingSummary } from "./BookingSummary";
import { CustomerAccountPanel, customerFromAccount } from "./CustomerAccountPanel";
import { CustomerBookingForm, type CustomerFormValues } from "./CustomerBookingForm";
import { ServiceSelector } from "./ServiceSelector";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { customerSession, type PublicClient } from "./customerSession";
import { isPublicCustomerStepValid } from "./bookingFormValidation";
import "./public-booking.css";

function todayIsoLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PublicBarberBookingPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const slug = businessSlug ?? "";

  const [biz, setBiz] = useState<PublicBusiness | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [barbers, setBarbers] = useState<PublicBarber[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotStart, setSlotStart] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [dayHints, setDayHints] = useState<Record<string, boolean>>({});

  const [customer, setCustomer] = useState<CustomerFormValues>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [clientAccount, setClientAccount] = useState<PublicClient | null>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => todayIsoLocal(), []);

  const loadAll = useCallback(async () => {
    if (!slug) return;
    setLoadErr(null);
    try {
      const [b, s, bar] = await Promise.all([
        fetchPublicBusiness(slug),
        fetchPublicServices(slug),
        fetchPublicBarbers(slug),
      ]);
      setBiz(b);
      setServices(s);
      setBarbers(bar);
    } catch {
      setLoadErr("No encontramos esta barbería o el enlace no es válido.");
    }
  }, [slug]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!slug) return;
    const cached = customerSession.getClient(slug);
    if (cached) {
      setClientAccount(cached);
      setCustomer((prev) => customerFromAccount(cached, prev.notes));
    }
    void fetchCustomerMe(slug)
      .then((c) => {
        if (!c) return;
        setClientAccount(c);
        setCustomer((prev) => customerFromAccount(c, prev.notes));
      })
      .catch(() => {
        customerSession.clear(slug);
        setClientAccount(null);
      });
  }, [slug]);

  useEffect(() => {
    if (!biz?.allow_any_barber && barbers.length > 0 && !employeeId) {
      setEmployeeId(barbers[0].employee_id);
    }
  }, [biz, barbers, employeeId]);

  useEffect(() => {
    if (!slug || !serviceId) {
      setDayHints({});
      return;
    }
    const emp = employeeId || undefined;
    void fetchCalendarHints(slug, {
      year: calYear,
      month: calMonth,
      service_id: serviceId,
      employee_id: emp,
    }).then(setDayHints);
  }, [slug, serviceId, employeeId, calYear, calMonth]);

  useEffect(() => {
    if (!slug || !serviceId || !selectedDate) {
      setSlots([]);
      setSlotStart("");
      return;
    }
    if (!biz?.allow_any_barber && !employeeId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    const params: { date: string; service_id: string; employee_id?: string } = {
      date: selectedDate,
      service_id: serviceId,
    };
    if (employeeId) params.employee_id = employeeId;
    void fetchAvailability(slug, params)
      .then((d) => {
        setSlots(d.slots);
        setSlotStart("");
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [slug, serviceId, employeeId, selectedDate, biz?.allow_any_barber]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const selectedBarber = barbers.find((b) => b.employee_id === employeeId) ?? null;
  const selectedSlot = slots.find((s) => s.start === slotStart) ?? null;

  const stepperClass = (n: number) => {
    if (step > n) return "pb-step pb-step--done";
    if (step === n) return "pb-step pb-step--current";
    return "pb-step pb-step--todo";
  };

  const goCalendarPrev = () => {
    setSelectedDate("");
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const goCalendarNext = () => {
    setSelectedDate("");
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSuccessId(null);
    setServiceId("");
    setEmployeeId("");
    setSelectedDate("");
    setSlotStart("");
    setCustomer(
      clientAccount
        ? customerFromAccount(clientAccount)
        : { first_name: "", last_name: "", phone: "", email: "", notes: "" },
    );
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !biz) return;
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const res = await submitPublicBooking(slug, {
        service_id: serviceId,
        employee_id: employeeId || undefined,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        first_name: customer.first_name.trim(),
        last_name: customer.last_name.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim() || undefined,
        notes: customer.notes.trim() || undefined,
      });
      setSuccessId(res.appointment_id);
    } catch (e: unknown) {
      const msg =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { error?: string } } }).response?.data?.error ===
          "string"
          ? (e as { response: { data: { error: string } } }).response.data.error
          : "No pudimos completar la reserva. Prueba otro horario.";
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!slug) {
    return (
      <div className="pb-root pb-state-center">
        <p className="pb-error">Enlace inválido.</p>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="pb-root pb-state-center">
        <p className="pb-error">{loadErr}</p>
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="pb-root pb-loading-screen">
        Cargando…
      </div>
    );
  }

  if (successId) {
    return (
      <BookingSuccessState
        appointmentId={successId}
        businessName={biz.name}
        onBookAnother={resetFlow}
      />
    );
  }

  return (
    <div className="pb-root pb-hero-wrap" style={{ minHeight: "100vh", color: "#0f172a" }}>
      <div className="pb-inner">
        <header className="pb-hero">
          <p className="pb-hero-kicker">Reserva en línea</p>
          <div className="pb-hero-row">
            {mediaUrl(biz.logo_url) ? (
              <img className="pb-hero-logo" src={mediaUrl(biz.logo_url) ?? ""} alt="" />
            ) : (
              <div className="pb-hero-logo-fallback" aria-hidden />
            )}
            <div>
              <h1 className="pb-hero-title">{biz.name}</h1>
              <p className="pb-hero-meta">{biz.address}</p>
              <p className="pb-hero-contact">
                {biz.phone} · {biz.email}
              </p>
            </div>
          </div>
          {biz.description ? <p className="pb-hero-desc">{biz.description}</p> : null}
        </header>

        <div className="pb-card">
          <div className="pb-stepper" role="list" aria-label="Pasos de la reserva">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={stepperClass(n)} role="listitem">
                <span className="pb-step-num">{n}.</span>
                {n === 1 ? "Servicio" : n === 2 ? "Fecha y hora" : n === 3 ? "Tus datos" : "Confirmar"}
              </div>
            ))}
          </div>

          {submitErr ? <div className="pb-alert">{submitErr}</div> : null}

          {step === 1 && (
            <div className="pb-step-stack">
              <ServiceSelector
                services={services}
                value={serviceId}
                onChange={(id) => {
                  setServiceId(id);
                  setSelectedDate("");
                  setSlotStart("");
                }}
              />
              <BarberSelector
                barbers={barbers}
                allowAny={biz.allow_any_barber}
                value={employeeId}
                onChange={(id) => {
                  setEmployeeId(id);
                  setSelectedDate("");
                  setSlotStart("");
                }}
              />
              <div className="pb-actions" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className="pb-btn pb-btn-primary"
                  style={{ alignSelf: "flex-start" }}
                  disabled={!serviceId || (!biz.allow_any_barber && !employeeId)}
                  onClick={() => setStep(2)}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pb-step-stack">
              <div className="pb-datetime-layout">
                <BookingCalendar
                  year={calYear}
                  month={calMonth}
                  selectedDate={selectedDate}
                  onSelectDate={(iso) => {
                    setSelectedDate(iso);
                    setSlotStart("");
                  }}
                  dayHints={dayHints}
                  minDate={minDate}
                  todayIso={minDate}
                  onPrevMonth={goCalendarPrev}
                  onNextMonth={goCalendarNext}
                />
                {selectedDate ? (
                  <div className="pb-datetime-slots">
                    <p className="pb-slots-section-title">Horarios disponibles</p>
                    <TimeSlotPicker
                      slots={slots}
                      value={slotStart}
                      onChange={setSlotStart}
                      loading={slotsLoading}
                    />
                  </div>
                ) : null}
              </div>
              <div className="pb-actions">
                <button type="button" className="pb-btn pb-btn-secondary" onClick={() => setStep(1)}>
                  Atrás
                </button>
                <button
                  type="button"
                  className="pb-btn pb-btn-primary"
                  disabled={!selectedDate || !slotStart}
                  onClick={() => setStep(3)}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="pb-step-stack">
              <CustomerAccountPanel
                slug={slug}
                client={clientAccount}
                customer={customer}
                onCustomerChange={setCustomer}
                onAuthed={(c) => {
                  setClientAccount(c);
                  setCustomer((prev) => customerFromAccount(c, prev.notes));
                }}
                onLogout={() => {
                  customerSession.clear(slug);
                  setClientAccount(null);
                  setCustomer({
                    first_name: "",
                    last_name: "",
                    phone: "",
                    email: "",
                    notes: "",
                  });
                }}
                form={<CustomerBookingForm value={customer} onChange={setCustomer} />}
              />
              <div className="pb-actions" style={{ marginTop: 0 }}>
                <button type="button" className="pb-btn pb-btn-secondary" onClick={() => setStep(2)}>
                  Atrás
                </button>
                <button
                  type="button"
                  className="pb-btn pb-btn-primary"
                  disabled={!isPublicCustomerStepValid(customer)}
                  onClick={() => setStep(4)}
                >
                  Ver resumen
                </button>
              </div>
            </div>
          )}

          {step === 4 && selectedSlot && (
            <BookingSummary
              business={biz}
              service={selectedService}
              barber={employeeId ? selectedBarber : null}
              slot={selectedSlot}
              customer={customer}
              onConfirm={() => void handleConfirmBooking()}
              onBack={() => setStep(3)}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
