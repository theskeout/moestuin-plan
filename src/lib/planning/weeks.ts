export interface WeekRange {
  startWeek: number;
  endWeek: number;
}

/** ISO 8601 weeknummer (1-53) */
export function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  // Donderdag van deze week bepaalt het ISO-weeknummer
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

/** Start- en einddatum van een ISO-week */
export function getWeekDates(weekNum: number, year: number): { start: Date; end: Date } {
  // 4 januari valt altijd in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // maandag=1
  // Maandag van week 1
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

/** Converteer MonthRange (1-12) naar WeekRange (1-53) */
export function monthRangeToWeekRange(range: { start: number; end: number }): WeekRange {
  // Maand X begint ≈ week (X-1)*4.33 + 1, eindigt ≈ week X*4.33
  const startWeek = Math.max(1, Math.round((range.start - 1) * 4.33 + 1));
  const endWeek = Math.min(53, Math.round(range.end * 4.33));
  return { startWeek, endWeek };
}

/** Check of een weeknummer in een WeekRange valt (inclusief wrap-around) */
export function isInWeekRange(week: number, range: WeekRange): boolean {
  if (range.startWeek <= range.endWeek) {
    return week >= range.startWeek && week <= range.endWeek;
  }
  // Wrap-around (bijv. week 44 t/m week 12)
  return week >= range.startWeek || week <= range.endWeek;
}

/** Converteer frost date string "MM-DD" naar weeknummer */
export function frostDateToWeek(frostDateStr: string, year: number): number {
  const [month, day] = frostDateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return getISOWeek(date);
}

const MONTH_NAMES_SHORT = ["", "jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** Formatteer weeknummer als "Week 12 (17-23 mrt)" */
export function formatWeekLabel(weekNum: number, year: number): string {
  const { start, end } = getWeekDates(weekNum, year);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = MONTH_NAMES_SHORT[start.getMonth() + 1];
  const endMonth = MONTH_NAMES_SHORT[end.getMonth() + 1];

  if (startMonth === endMonth) {
    return `Week ${weekNum} (${startDay}-${endDay} ${startMonth})`;
  }
  return `Week ${weekNum} (${startDay} ${startMonth} - ${endDay} ${endMonth})`;
}
