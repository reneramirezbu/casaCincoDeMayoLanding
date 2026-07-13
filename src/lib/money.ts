/**
 * Money helpers.
 *
 * INVARIANT: money is ALWAYS stored and passed around as an INTEGER number of
 * centavos (1 MXN = 100 centavos). Never use floats for money math — floats
 * lose precision on repeated addition. All arithmetic here stays in integers;
 * we only convert to a fractional string at the very last formatting step.
 */

/** A whole number of centavos (MXN). Documented alias for readability. */
export type Centavos = number;

/** Guard: throw if a value that must be integer centavos is not. */
export function assertCentavos(value: number, label = "amount"): Centavos {
  if (!Number.isInteger(value)) {
    throw new TypeError(
      `${label} must be an integer number of centavos, got ${value}`,
    );
  }
  return value;
}

/** Convert whole pesos to centavos. e.g. pesosToCentavos(2500) => 250000. */
export function pesosToCentavos(pesos: number): Centavos {
  return Math.round(pesos * 100);
}

/**
 * Format integer centavos as MXN, e.g. formatMXN(123400) => "MX$1,234.00".
 * Formats straight from the integer (no float division) to avoid rounding drift.
 */
export function formatMXN(centavos: Centavos): string {
  const negative = centavos < 0;
  const abs = Math.abs(Math.trunc(centavos));
  const whole = Math.trunc(abs / 100);
  const frac = abs % 100;
  // Group the integer part with thousands separators.
  const grouped = whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(2, "0");
  return `${negative ? "-" : ""}MX$${grouped}.${fracStr}`;
}

/** Sum a list of centavos amounts, staying in integer space. */
export function sumCentavos(amounts: Centavos[]): Centavos {
  return amounts.reduce((total, n) => total + Math.trunc(n), 0);
}
