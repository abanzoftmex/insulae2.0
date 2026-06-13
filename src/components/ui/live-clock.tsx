"use client";

import { useEffect, useState } from "react";

interface LiveClockProps {
  initialDate: string;
  initialTime: string;
}

export function LiveClock({ initialDate, initialTime }: LiveClockProps) {
  const [timeStr, setTimeStr] = useState(`${initialDate} · ${initialTime}`);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Mexico_City",
      });
      const clockStr = now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Mexico_City",
      });
      setTimeStr(`${dateStr} · ${clockStr}`);
    };

    // Sync on mount
    updateTime();

    // Update every 10 seconds since we only show minutes
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return <span>{timeStr}</span>;
}
