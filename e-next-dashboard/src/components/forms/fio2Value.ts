export type Fio2Unit = "FiO2" | "O2";

export function parseStoredFio2(
  raw: number | string | null | undefined
): { unit: Fio2Unit; amount: string } {
  if (raw === null || raw === undefined || raw === "") {
    return { unit: "FiO2", amount: "" };
  }

  const text = String(raw).trim();

  const tagged = text.match(/^(fio2|o2)\s*:\s*(-?\d*\.?\d+)$/i);
  if (tagged) {
    return {
      unit: tagged[1].toLowerCase() === "o2" ? "O2" : "FiO2",
      amount: tagged[2],
    };
  }

  const litre = text.match(/^(-?\d*\.?\d+)\s*(litre|litres|liter|liters|l)$/i);
  if (litre) {
    return { unit: "O2", amount: litre[1] };
  }

  const percent = text.match(/^(-?\d*\.?\d+)\s*%$/);
  if (percent) {
    return { unit: "FiO2", amount: percent[1] };
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { unit: "FiO2", amount: String(raw) };
  }

  const plain = text.match(/^(-?\d*\.?\d+)$/);
  if (plain) {
    return { unit: "FiO2", amount: plain[1] };
  }

  return { unit: "FiO2", amount: text };
}

export function formatFio2ForSave(unit: Fio2Unit, amount: string): string | null {
  const trimmed = amount.trim();
  if (!trimmed) return null;
  return unit === "O2" ? `O2:${trimmed}` : `FiO2:${trimmed}`;
}

export function displayStoredFio2(raw: number | string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "-";
  const parsed = parseStoredFio2(raw);
  if (!parsed.amount) return "-";
  const text = String(raw).trim();
  const legacyPlain = typeof raw === "number" || /^-?\d*\.?\d+$/.test(text);
  if (legacyPlain) return text;
  return parsed.unit === "O2" ? `${parsed.amount} L` : `${parsed.amount} %`;
}
