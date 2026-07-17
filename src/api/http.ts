import axios from "axios";
import { session } from "../auth/session";

/** Attach shop JWT on every request (skip public booking — uses customer token when set). */
axios.interceptors.request.use((config) => {
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  if (url.includes("/api/public/")) {
    return config;
  }

  const token = session.getToken();
  if (token) {
    if (typeof config.headers?.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } else if (config.headers) {
    if (typeof config.headers.delete === "function") {
      config.headers.delete("Authorization");
    } else {
      delete (config.headers as Record<string, unknown>).Authorization;
    }
  }
  return config;
});
