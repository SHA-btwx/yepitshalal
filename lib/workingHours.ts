// "48 working hours" = 48 elapsed clock-hours, counted only across calendar
// days that are Monday–Friday and not a UK bank holiday. A working day
// contributes all 24 of its hours; weekends/holidays contribute zero and are
// skipped entirely, even though the wall-clock keeps moving through them.
// Worked example: Friday 3pm start → 9h count from Friday, weekend skipped,
// 24h count all of Monday, remaining 15h into Tuesday → due Tuesday 3pm.
export function addWorkingHours(start: Date, hours: number, bankHolidays: Set<string>): Date {
  const result = new Date(start);
  let remaining = hours;
  while (remaining > 0) {
    result.setHours(result.getHours() + 1);
    const day = result.getDay();
    const dateKey = result.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !bankHolidays.has(dateKey)) {
      remaining -= 1;
    }
  }
  return result;
}
