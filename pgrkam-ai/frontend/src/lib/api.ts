const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

/** Shared browser/server fetch wrapper for future API modules. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return fetch(new URL(path, apiBaseUrl), init);
}
