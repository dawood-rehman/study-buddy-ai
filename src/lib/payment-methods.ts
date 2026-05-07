export type LocalPaymentMethod = "easypaisa" | "jazzcash" | "bank";

export type LocalPaymentMethodDetails = {
  method: LocalPaymentMethod;
  label: string;
  accountNumber: string;
  accountTitle: string;
  iban?: string;
  instructions?: string;
  enabled: boolean;
};

export const localPaymentMethodOrder: LocalPaymentMethod[] = ["easypaisa", "jazzcash", "bank"];

export const defaultLocalPaymentMethods: Record<LocalPaymentMethod, LocalPaymentMethodDetails> = {
  easypaisa: {
    method: "easypaisa",
    label: "Easypaisa",
    accountNumber: "0314-4885177",
    accountTitle: "SHAFIQEUR REHMAN",
    instructions: "Send payment to this Easypaisa account, then submit your transaction ID for admin verification.",
    enabled: true,
  },
  jazzcash: {
    method: "jazzcash",
    label: "JazzCash",
    accountNumber: "0326-7204572",
    accountTitle: "Dawood Rehman",
    instructions: "Send payment to this JazzCash account, then submit your transaction ID for admin verification.",
    enabled: true,
  },
  bank: {
    method: "bank",
    label: "Meezan Bank",
    accountNumber: "0030 0112118331",
    accountTitle: "DAUD REHMAN",
    iban: "PK11 MEZN 0000 3001 1211 8331",
    instructions: "Transfer payment to this Meezan Bank account, then submit your reference number for admin verification.",
    enabled: true,
  },
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLocalPaymentMethods(value?: Partial<Record<LocalPaymentMethod, Partial<LocalPaymentMethodDetails>>> | null) {
  return localPaymentMethodOrder.reduce<Record<LocalPaymentMethod, LocalPaymentMethodDetails>>((accumulator, method) => {
    const fallback = defaultLocalPaymentMethods[method];
    const item = value?.[method] || {};

    accumulator[method] = {
      method,
      label: cleanText(item.label) || fallback.label,
      accountNumber: cleanText(item.accountNumber) || fallback.accountNumber,
      accountTitle: cleanText(item.accountTitle) || fallback.accountTitle,
      iban: cleanText(item.iban) || fallback.iban,
      instructions: cleanText(item.instructions) || fallback.instructions,
      enabled: item.enabled === undefined ? fallback.enabled : item.enabled === true,
    };

    return accumulator;
  }, {} as Record<LocalPaymentMethod, LocalPaymentMethodDetails>);
}
