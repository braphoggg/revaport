export class ApiError extends Error {
  status: number
  detail?: unknown
  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let detail: unknown = undefined
  let message = `${res.status} ${res.statusText}`
  try {
    const body = await res.json()
    detail = body
    if (body?.detail) message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
  } catch {
    /* ignore */
  }
  return new ApiError(res.status, message, detail)
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(path, { method: 'POST', body: formData })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as T
}
