import axios from "axios";

const API_BASE = "http://127.0.0.1:5000/api";

export interface AuthUser {
  business_id: string | null;
  email: string;
  id: string;
  is_active: boolean;
  role: string;
}

export interface SignUpPayload {
  user: {
    email: string;
    password: string;
    is_active: boolean;
  };
  seed_token: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignInResponse {
  access_token: string;
  user: AuthUser;
}

export const authApi = {
  signUp: (data: SignUpPayload) =>
    axios.post(`${API_BASE}/auth/signup`, data),

  signIn: (data: SignInPayload) =>
    axios.post<SignInResponse>(`${API_BASE}/auth/signin`, data),

  shopSignIn: (data: SignInPayload) =>
    axios.post<SignInResponse>(`${API_BASE}/auth/shop/signin`, data),
};
