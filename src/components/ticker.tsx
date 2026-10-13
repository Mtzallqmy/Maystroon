"use client";
import { useState } from "react";
import { Pause, Play } from "lucide-react";
export function Ticker({
  items,
}: {
  items: { id: string; text: string; url: string | null }[];
}) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;
  return (
    <div className={"ticker " + (paused ? "paused" : "")}>
      <strong>على السطر</strong>
      <div className="ticker-window">
        <div className="ticker-track">
          {items.map((i) => (
            <span key={i.id}>
              {i.url && /^(https:\/\/|\/(?!\/))/.test(i.url) ? (
                <a href={i.url}>{i.text}</a>
              ) : (
                i.text
              )}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => setPaused(!paused)}
        aria-label={paused ? "تشغيل الشريط" : "إيقاف الشريط"}
      >
        {paused ? <Play size={18} /> : <Pause size={18} />}
      </button>
    </div>
  );
}
