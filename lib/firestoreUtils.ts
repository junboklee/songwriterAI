import { Timestamp } from 'firebase-admin/firestore';

type TimestampLike = {
  toDate: () => Date;
};

function isTimestampLike(value: unknown): value is TimestampLike {
  if (value instanceof Timestamp) {
    return true;
  }

  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as Record<string, unknown>).toDate === 'function'
  );
}

export function serializeTimestamp(value: unknown): string | null {
  if (!isTimestampLike(value)) {
    return null;
  }

  const date = value.toDate();

  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}
