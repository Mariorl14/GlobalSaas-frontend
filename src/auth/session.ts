export type AuthUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  role: string;
  is_active: boolean;
  business_id: string | null;
};

const TOKEN_KEY = "auth.access_token";
const USER_KEY = "auth.user";

export const session = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem(USER_KEY);
  },

  clearAll() {
    session.clearToken();
    session.clearUser();
  },
};

