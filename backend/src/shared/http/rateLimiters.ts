import rateLimit from "express-rate-limit";

const ONE_MINUTE_MS = 60 * 1000;

// Endpoints de escrita (cadastro, reprocessamento) são mais restritos: previnem
// abuso em fluxos de alto impacto, sem travar o uso legítimo do dashboard.
export const writeRateLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Muitas requisições de escrita. Tente novamente em instantes.",
  },
});

// Listagem é chamada com frequência pelo polling do dashboard, então recebe um limite mais generoso.
export const readRateLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Muitas requisições. Tente novamente em instantes.",
  },
});
