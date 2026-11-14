// Kap. 1 / 4.4.6: the conditions of the age reached in the exam's calendar year apply.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date in ISO form YYYY-MM-DD. */
export function isIsoDate(text: string): boolean {
  const match = ISO_DATE.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Age reached in the calendar year `year` (Jahrgangsprinzip). */
export function ageInYear(birthYear: number, year: number): number {
  return year - birthYear;
}
