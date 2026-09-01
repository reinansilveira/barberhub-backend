import * as crypto from 'crypto';

export function generateTempPassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  const pick = (set: string) => set[crypto.randomInt(set.length)];

  return (
    pick(upper) +
    pick(lower) +
    pick(digits) +
    Array.from({ length: length - 3 }, () => pick(all)).join('')
  );
}