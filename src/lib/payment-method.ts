import type { PaymentMethod } from "@/store/types";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "check",
  "bank_transfer",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  check: "Chèque",
  bank_transfer: "Virement bancaire",
};

export function paymentMethodLabel(
  method: PaymentMethod | null | undefined,
): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
