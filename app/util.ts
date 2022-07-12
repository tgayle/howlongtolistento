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

  console.log(days, hours, minutes, seconds);

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
    string: all.reduce((acc, duration, index) => {
      if (index === all.length - 2) {
        return `${acc} and ${duration}`;
      } else {
        return `${acc}, ${duration}`;
      }
    }, ""),
  };
}

function pluralize(count: number, word: string) {
  if (count < 0) return "";
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}
