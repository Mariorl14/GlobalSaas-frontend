import { API_BASE_URL } from "./config";

/** Resolve stored logo paths (`/uploads/...`) against the API host. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${API_BASE_URL}${trimmed}`;
  }
  return `${API_BASE_URL}/${trimmed}`;
}
