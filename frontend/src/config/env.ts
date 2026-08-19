interface AppEnv {
  apiBaseUrl: string;
}

function readApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw.trim().length === 0) {
    throw new Error("VITE_API_BASE_URL não definida. Configure o arquivo .env do frontend.");
  }
  return raw.trim().replace(/\/+$/, "");
}

export const env: AppEnv = {
  apiBaseUrl: readApiBaseUrl(),
};
