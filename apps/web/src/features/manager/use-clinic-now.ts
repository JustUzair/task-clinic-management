"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Kolkata",
  year: "numeric",
});

function currentClinicFields() {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function useClinicNow() {
  const [now, setNow] = useState(currentClinicFields);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(currentClinicFields());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  return now;
}
