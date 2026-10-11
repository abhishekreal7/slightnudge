"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export function ProductWindow() {
  const windowRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.647);

  useLayoutEffect(() => {
    const element = windowRef.current;
    if (!element) return;

    const resize = () => setScale(element.clientWidth / 1360);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={windowRef}
      className="sn-demo-embed"
      style={{ "--preview-scale": scale } as CSSProperties}
      aria-label="Ramp HQ task board HTML preview"
    >
      <iframe
        className="sn-demo-embed-frame"
        src="/previews/ramp-hq-board.html"
        title="Ramp HQ task board preview"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        loading="eager"
        scrolling="no"
      />
    </div>
  );
}
