// All date logic lives here. A "day" is a local calendar date string `YYYY-MM-DD`.
// Arithmetic goes through Date.UTC on integer y/m/d purely as a calendar calculator,
// so DST changes and the machine's time zone can never shift a day.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export interface YMD {
  y: number;
  m: number; // 1–12
  d: number; // 1–31
}

export function isValidDate(s: string): boolean {
  const match = DATE_RE.exec(s);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function parseDate(s: string): YMD {
  if (!isValidDate(s)) throw new Error(`Invalid date "${s}", expected YYYY-MM-DD`);
  const [y = 0, m = 0, d = 0] = s.split("-").map(Number);
  return { y, m, d };
}

export function formatDate({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toDayNumber(s: string): number {
  const { y, m, d } = parseDate(s);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromDayNumber(n: number): string {
  const t = new Date(n * MS_PER_DAY);
  return formatDate({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
}

export function addDays(s: string, n: number): string {
  return fromDayNumber(toDayNumber(s) + n);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function diffDays(a: string, b: string): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** Lexicographic order is chronological for zero-padded ISO dates. */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Today in the machine's local time zone. `now` is injectable for tests. */
export function todayLocal(now: Date = new Date()): string {
  return formatDate({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(s: string): number {
  const { y, m, d } = parseDate(s);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Tue 3 Nov" */
export function formatShort(s: string): string {
  const { m, d } = parseDate(s);
  return `${WEEKDAY_NAMES[weekdayIndex(s)]} ${d} ${MONTH_NAMES[m - 1]!.slice(0, 3)}`;
}

/** "Sat 23 Jan 2027" */
export function formatLong(s: string): string {
  return `${formatShort(s)} ${parseDate(s).y}`;
}

/** "3 Nov" */
export function formatDayMonth(s: string): string {
  const { m, d } = parseDate(s);
  return `${d} ${MONTH_NAMES[m - 1]!.slice(0, 3)}`;
}

/** "November 2026" */
export function monthLabel(y: number, m: number): string {
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths({ y, m }: { y: number; m: number }, n: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + n;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

/** Month grid rows (Monday first); `null` pads days outside the month. */
export function monthGrid(y: number, m: number): (string | null)[][] {
  const first = formatDate({ y, m, d: 1 });
  const cells: (string | null)[] = Array(weekdayIndex(first)).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(formatDate({ y, m, d }));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
