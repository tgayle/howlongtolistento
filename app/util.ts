const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export type TimeUnits = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  cellsUsed: 0 | 1 | 2 | 3 | 4;
  string: string;
};

export function getTimeUnits(totalTimeMs: number): TimeUnits {
  const days = Math.floor(totalTimeMs / DAY);
  const dayFraction = totalTimeMs % DAY;
  const hours = Math.floor(dayFraction / HOUR);
  const hourFraction = dayFraction % HOUR;
  const minutes = Math.floor(hourFraction / MINUTE);
  const minuteFraction = hourFraction % MINUTE;
  const seconds = Math.floor(minuteFraction / SECOND);

  const all = [
    pluralize(days, "day"),
    pluralize(hours, "hour"),
    pluralize(minutes, "minute"),
    pluralize(seconds, "second"),
  ].filter((it) => it);

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: Math.ceil(totalTimeMs / SECOND),
    string: all.join(", "),
    cellsUsed: all.length as TimeUnits["cellsUsed"],
  };
}

function pluralize(count: number, word: string) {
  if (count <= 0) return "";
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

export function sumBy<T>(arr: T[], selector: (it: T) => number): number {
  return arr.reduce((sum, it) => sum + selector(it), 0);
}
