const AMOUNT_PATTERN = /^(0|[1-9]\d*)$/;

export type AmountString = `${bigint}`;

export function normalizeAmountString(value: unknown, fieldName = 'amount'): AmountString {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error(`${fieldName} cannot be negative`);
    return value.toString() as AmountString;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new Error(`${fieldName} must be a non-negative integer`);
    }
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${fieldName} must be provided as string/bigint when outside safe integer range`);
    }
    return BigInt(value).toString() as AmountString;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!AMOUNT_PATTERN.test(trimmed)) {
      throw new Error(`${fieldName} must be a non-negative integer string in base units`);
    }
    return BigInt(trimmed).toString() as AmountString;
  }

  throw new Error(`${fieldName} must be a bigint, number, or numeric string`);
}

export function addAmountStrings(left: unknown, right: unknown): AmountString {
  const a = normalizeAmountString(left, 'amountPaid(left)');
  const b = normalizeAmountString(right, 'amountPaid(right)');
  return (BigInt(a) + BigInt(b)).toString() as AmountString;
}
