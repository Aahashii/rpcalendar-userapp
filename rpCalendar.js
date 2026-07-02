// lib/rpCalendar.js
// Shared RP calendar math — same logic used across the Discord bot, website,
// and JSON API. Keep REAL_ANCHOR_UTC_MS / RP_ANCHOR in sync across all of them.

const DAY_MS = 24 * 60 * 60 * 1000;

const REAL_ANCHOR_UTC_MS = Date.UTC(2026, 6, 1, 0, 0, 0); // 2026-07-01T00:00:00Z
const RP_ANCHOR = { year: 1958, month: 1, day: 1, hour: 0, minute: 0 };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

function resolveRPOffset(startYear, elapsedMs) {
  let year = startYear;
  let month = 1;
  let remaining = elapsedMs;

  while (true) {
    const monthMs = daysInMonth(year, month) * DAY_MS;
    if (remaining >= monthMs) {
      remaining -= monthMs;
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    } else {
      break;
    }
  }

  const day = Math.floor(remaining / DAY_MS) + 1;
  remaining %= DAY_MS;
  const hour = Math.floor(remaining / (60 * 60 * 1000));
  remaining %= 60 * 60 * 1000;
  const minute = Math.floor(remaining / (60 * 1000));
  remaining %= 60 * 1000;
  const second = Math.floor(remaining / 1000);

  return { year, month, day, hour, minute, second };
}

function getRPDate(nowUtcMs = Date.now()) {
  let elapsed = nowUtcMs - REAL_ANCHOR_UTC_MS;
  if (elapsed < 0) elapsed = 0;

  let realYear = new Date(REAL_ANCHOR_UTC_MS).getUTCFullYear();
  let realMonth = new Date(REAL_ANCHOR_UTC_MS).getUTCMonth() + 1;
  let rpYear = RP_ANCHOR.year;

  while (true) {
    const realMonthMs = daysInMonth(realYear, realMonth) * DAY_MS;

    if (elapsed >= realMonthMs) {
      elapsed -= realMonthMs;
      realMonth += 1;
      if (realMonth > 12) { realMonth = 1; realYear += 1; }
      rpYear += 1;
    } else {
      const fraction = elapsed / realMonthMs;
      const rpYearMs = daysInYear(rpYear) * DAY_MS;
      const rpElapsedMs = fraction * rpYearMs;
      return resolveRPOffset(rpYear, rpElapsedMs);
    }
  }
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatRPDate(rp) {
  return `${MONTH_NAMES[rp.month - 1]} ${rp.day}, ${rp.year}`;
}

function formatRPTime(rp) {
  return `${pad(rp.hour)}:${pad(rp.minute)}:${pad(rp.second)}`;
}

module.exports = { getRPDate, formatRPDate, formatRPTime, MONTH_NAMES };
