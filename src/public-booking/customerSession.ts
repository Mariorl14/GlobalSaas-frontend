export type PublicClient = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  username: string | null;
  has_account: boolean;
};

const tokenKey = (slug: string) => `customer.${slug}.token`;
const clientKey = (slug: string) => `customer.${slug}.client`;

export const customerSession = {
  getToken(slug: string): string | null {
    return localStorage.getItem(tokenKey(slug));
  },

  setSession(slug: string, token: string, client: PublicClient) {
    localStorage.setItem(tokenKey(slug), token);
    localStorage.setItem(clientKey(slug), JSON.stringify(client));
  },

  getClient(slug: string): PublicClient | null {
    const raw = localStorage.getItem(clientKey(slug));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PublicClient;
    } catch {
      return null;
    }
  },

  clear(slug: string) {
    localStorage.removeItem(tokenKey(slug));
    localStorage.removeItem(clientKey(slug));
  },
};
