const STORAGE_KEY = "petrus_auth_tokens";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export function getStoredTokens(): StoredTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: StoredTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          clearStoredTokens();
          return null;
        }
        const data = (await res.json()) as StoredTokens;
        setStoredTokens(data);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const tokens = getStoredTokens();
  const doFetch = async (accessToken?: string) => {
    return fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  };

  let response = await doFetch(options.skipAuth ? undefined : tokens?.accessToken);

  if (response.status === 401 && !options.skipAuth && tokens?.refreshToken) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await doFetch(newAccessToken);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message ?? "Erro inesperado.", response.status, body.issues);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Como apiFetch, mas para multipart/form-data (upload) — sem Content-Type fixo. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const tokens = getStoredTokens();
  const doFetch = async (accessToken?: string) =>
    fetch(`/api${path}`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: formData,
    });

  let response = await doFetch(tokens?.accessToken);

  if (response.status === 401 && tokens?.refreshToken) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await doFetch(newAccessToken);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message ?? "Erro inesperado.", response.status, body.issues);
  }

  return response.json() as Promise<T>;
}

/** Baixa um arquivo autenticado e devolve um Blob pronto para salvar no navegador. */
export async function apiDownloadBlob(path: string): Promise<Blob> {
  const tokens = getStoredTokens();
  const doFetch = async (accessToken?: string) =>
    fetch(`/api${path}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

  let response = await doFetch(tokens?.accessToken);

  if (response.status === 401 && tokens?.refreshToken) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await doFetch(newAccessToken);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message ?? "Erro ao baixar arquivo.", response.status, body.issues);
  }

  return response.blob();
}
