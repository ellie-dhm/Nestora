const API_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;
  constructor(
    message: string,
    status: number,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(
      data.error ?? "Something went wrong",
      res.status,
      data.fields,
    );
  return data as T;
}
