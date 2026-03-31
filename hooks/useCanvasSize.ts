import { useState, useEffect, useCallback, useRef } from "react";
import { FIELD_ASPECT_RATIO, TOOLBAR_HEIGHT, TIMELINE_HEIGHT, MOBILE_BOTTOM_BAR_HEIGHT } from "@/lib/constants";

interface CanvasSize {
  width: number;
  height: number;
}

export function useCanvasSize(containerRef: React.RefObject<HTMLDivElement | null>): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const calculate = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const containerWidth = el.clientWidth;
    const containerHeight = el.clientHeight;

    // Fit field maintaining aspect ratio
    let w = containerWidth;
    let h = w / FIELD_ASPECT_RATIO;

    if (h > containerHeight) {
      h = containerHeight;
      w = h * FIELD_ASPECT_RATIO;
    }

    setSize({ width: Math.floor(w), height: Math.floor(h) });
  }, [containerRef]);

  useEffect(() => {
    calculate();

    const el = containerRef.current;
    if (!el) return;

    observerRef.current = new ResizeObserver(calculate);
    observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [calculate, containerRef]);

  return size;
}
