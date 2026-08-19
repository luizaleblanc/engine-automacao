export const AUTOMATION_STATUSES = ["PENDENTE", "PROCESSANDO", "SUCESSO", "FALHA"] as const;

export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];
