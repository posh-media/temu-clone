import { useEffect, useState } from "react";

/**
 * Counts down to a target time, returning zero-padded parts for the
 * `HH : MM : SS` timer Temu shows above its lightning-deal rails.
 */
export function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, target.getTime() - Date.now()));
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const totalSeconds = Math.floor(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    finished: remaining <= 0,
    hours: pad(Math.floor(totalSeconds / 3600)),
    minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
    seconds: pad(totalSeconds % 60),
  };
}

/** The end of the current clock hour - drives the hourly deal reset. */
export function useNextHour() {
  const [target, setTarget] = useState(nextHour);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTarget((current) => (current.getTime() <= Date.now() ? nextHour() : current));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return target;
}

function nextHour() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}
