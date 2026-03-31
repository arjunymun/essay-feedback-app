import { DEFAULT_CURRENCY, STARTER_PACK_KEY } from "@/lib/constants";
import type { CreditPackDefinition } from "@/lib/types";

export const CREDIT_PACKS: Record<string, CreditPackDefinition> = {
  [STARTER_PACK_KEY]: {
    key: STARTER_PACK_KEY,
    name: "Starter Pack",
    description: "10 additional analyses for students who want to keep revising.",
    credits: 10,
    unitAmount: 599,
    currency: DEFAULT_CURRENCY,
  },
};

export function getCreditPack(packKey: string) {
  return CREDIT_PACKS[packKey] ?? null;
}

export function formatCurrency(unitAmount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);
}
