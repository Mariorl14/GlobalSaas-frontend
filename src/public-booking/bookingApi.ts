import axios from "axios";
import { API_BASE_URL } from "../config";
import { customerSession, type PublicClient } from "./customerSession";

const base = `${API_BASE_URL}/api/public/booking`;

function customerHeaders(slug: string) {
  const token = customerSession.getToken(slug);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type PublicBusiness = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
  description: string | null;
  allow_any_barber: boolean;
  slug: string;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
};

export type PublicBarber = {
  employee_id: string;
  label: string;
  email: string | null;
};

export type Slot = {
  start: string;
  end: string;
  employee_id: string | null;
};

export async function fetchPublicBusiness(slug: string) {
  const res = await axios.get<PublicBusiness>(`${base}/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function fetchPublicServices(slug: string) {
  const res = await axios.get<{ items: PublicService[] }>(
    `${base}/${encodeURIComponent(slug)}/services`,
  );
  return res.data.items;
}

export async function fetchPublicBarbers(slug: string) {
  const res = await axios.get<{ items: PublicBarber[] }>(
    `${base}/${encodeURIComponent(slug)}/barbers`,
  );
  return res.data.items;
}

export async function fetchAvailability(
  slug: string,
  params: { date: string; service_id: string; employee_id?: string },
) {
  const res = await axios.get<{ slots: Slot[]; allow_any_barber: boolean }>(
    `${base}/${encodeURIComponent(slug)}/availability`,
    { params },
  );
  return res.data;
}

export async function fetchCalendarHints(
  slug: string,
  params: { year: number; month: number; service_id: string; employee_id?: string },
) {
  const res = await axios.get<{ days: Record<string, boolean> }>(
    `${base}/${encodeURIComponent(slug)}/calendar-hints`,
    { params },
  );
  return res.data.days;
}

export async function customerRegister(
  slug: string,
  body: {
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
  },
) {
  const res = await axios.post<{ access_token: string; client: PublicClient }>(
    `${base}/${encodeURIComponent(slug)}/auth/register`,
    body,
  );
  customerSession.setSession(slug, res.data.access_token, res.data.client);
  return res.data;
}

export async function customerSignIn(
  slug: string,
  body: { username: string; password: string },
) {
  const res = await axios.post<{ access_token: string; client: PublicClient }>(
    `${base}/${encodeURIComponent(slug)}/auth/signin`,
    body,
  );
  customerSession.setSession(slug, res.data.access_token, res.data.client);
  return res.data;
}

export async function fetchCustomerMe(slug: string) {
  const token = customerSession.getToken(slug);
  if (!token) return null;
  const res = await axios.get<{ client: PublicClient }>(
    `${base}/${encodeURIComponent(slug)}/auth/me`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  customerSession.setSession(slug, token, res.data.client);
  return res.data.client;
}

export async function submitPublicBooking(
  slug: string,
  body: {
    service_id: string;
    employee_id?: string | null;
    start_time: string;
    end_time: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    notes?: string;
  },
) {
  const res = await axios.post<{ appointment_id: string; message: string }>(
    `${base}/${encodeURIComponent(slug)}/bookings`,
    body,
    { headers: customerHeaders(slug) },
  );
  return res.data;
}
