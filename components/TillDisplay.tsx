"use client";

import { useEffect, useState } from "react";

export default function TillDisplay() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="neu-pressed inline-flex items-center gap-2.5 px-3.5 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
      <span className="h-2 w-2 flex-shrink-0 animate-pulse-soft rounded-full bg-neu-accent" />
      <span className="font-mono text-xs tabular-nums text-neu-text sm:text-sm">
        {time || "00:00:00"}
      </span>
    </div>
  );
}
