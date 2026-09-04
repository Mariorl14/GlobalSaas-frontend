import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { installDomTranslateGuard } from "./domTranslateGuard";

installDomTranslateGuard();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root");
}

const path = window.location.pathname;
const isPublicCustomer =
  path.startsWith("/book/") || path.startsWith("/appointment/");

if (isPublicCustomer) {
  void import("./BookingApp").then(({ mountPublicBooking }) => {
    mountPublicBooking(rootEl);
  });
} else {
  void Promise.all([import("./App.tsx"), import("./api/http"), import("./index.css")]).then(
    ([{ default: App }]) => {
      createRoot(rootEl).render(
        <StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StrictMode>,
      );
    },
  );
}
