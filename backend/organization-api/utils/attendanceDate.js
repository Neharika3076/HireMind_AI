const timeZone = process.env.ATTENDANCE_TIME_ZONE || "Asia/Kolkata";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function getDateKey(date = new Date()) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getMonthDateKeys(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dateKeys = [];
  for (let day = 1; day <= lastDay; day += 1) {
    dateKeys.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return dateKeys;
}

function getMonthKey(dateKey) {
  return dateKey.slice(0, 7);
}

function countDaysByMonth(dateKeys) {
  return dateKeys.reduce((counts, dateKey) => {
    const monthKey = getMonthKey(dateKey);
    counts.set(monthKey, (counts.get(monthKey) || 0) + 1);
    return counts;
  }, new Map());
}

function listDateKeys(startDateKey, endDateKey) {
  const dates = [];
  const current = new Date(`${startDateKey}T00:00:00.000Z`);
  const end = new Date(`${endDateKey}T00:00:00.000Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 2000 || year > 2100) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

module.exports = {
  timeZone,
  getDateKey,
  getMonthDateKeys,
  getMonthKey,
  countDaysByMonth,
  listDateKeys,
  isValidDateKey
};
