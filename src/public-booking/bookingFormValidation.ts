import type { CustomerFormValues } from "./CustomerBookingForm";

const PHONE_MIN_LEN = 6;
const PHONE_MAX_LEN = 20;
const NAME_MAX_LEN = 80;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Mirrors backend public booking rules enough for UX (server remains authoritative). */
export function isPublicCustomerStepValid(c: CustomerFormValues): boolean {
  const first = c.first_name.trim();
  const last = c.last_name.trim();
  const phone = c.phone.trim();
  const email = c.email.trim();
  if (!first || !last || first.length > NAME_MAX_LEN || last.length > NAME_MAX_LEN) {
    return false;
  }
  if (phone.length < PHONE_MIN_LEN || phone.length > PHONE_MAX_LEN) {
    return false;
  }
  if (email.length > 0 && (email.length > 120 || !EMAIL_RE.test(email))) {
    return false;
  }
  return true;
}
