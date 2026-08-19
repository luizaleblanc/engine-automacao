import { env } from "../../config/env";
import { ApiError, isApiErrorBody } from "./ApiError";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const init: RequestInit = { method: options.method ?? "GET" };
  if (options.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, init);

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    if (isApiErrorBody(payload)) {
      throw new ApiError(response.status, payload);
    }
    throw new ApiError(response.status, {
      error: "UnknownError",
      message: `Requisição falhou com status ${response.status}`,
    });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const httpClient = {
  get: <TResponse>(path: string): Promise<TResponse> => request<TResponse>(path),
  post: <TResponse>(path: string, body?: unknown): Promise<TResponse> =>
    request<TResponse>(path, { method: "POST", body }),
};
