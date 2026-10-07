"use client";

import { useEffect, useState } from "react";

export default function TypewriterText({
  text,
  speed = 35,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span className={className}>
      {shown}
      <span className="animate-pulse-soft">▌</span>
    </span>
  );
}
