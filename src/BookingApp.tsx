import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BookingErrorBoundary } from "./public-booking/BookingErrorBoundary";
import { PublicBarberBookingPage } from "./public-booking/PublicBarberBookingPage";
import { RouteFallback } from "./RouteFallback";
import "./public-booking/public-booking.css";

const RescheduleConfirmPage = lazy(() =>
  import("./public-booking/RescheduleConfirmPage").then((m) => ({
    default: m.RescheduleConfirmPage,
  })),
);

export function mountPublicBooking(el: HTMLElement) {
  createRoot(el).render(
    <StrictMode>
      <BrowserRouter>
        <BookingErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/book/:businessSlug" element={<PublicBarberBookingPage />} />
              <Route
                path="/appointment/reschedule/confirm/:token"
                element={<RescheduleConfirmPage />}
              />
            </Routes>
          </Suspense>
        </BookingErrorBoundary>
      </BrowserRouter>
    </StrictMode>,
  );
}
