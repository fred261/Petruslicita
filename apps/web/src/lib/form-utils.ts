/**
 * react-hook-form's `valueAsNumber` reads the DOM's `valueAsNumber`, which is
 * `NaN` for an empty <input type="number">. Zod's `z.number()` rejects `NaN`
 * even on `.nullable()` fields, so an empty optional field blocks submission
 * with no visible error. Use these as `setValueAs` instead.
 */
export function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function numberWithDefault(defaultValue: number) {
  return (value: string): number => (value === "" ? defaultValue : Number(value));
}
