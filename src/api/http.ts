import axios from "axios";
import { session } from "../auth/session";

/** Attach JWT on every request from localStorage (avoids race with React effects). */
axios.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});
