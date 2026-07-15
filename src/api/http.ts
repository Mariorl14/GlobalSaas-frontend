import axios from "axios";
import { session } from "../auth/session";

/** Attach JWT on every request from localStorage (avoids race with React effects). */
axios.interceptors.request.use((config) => {
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
