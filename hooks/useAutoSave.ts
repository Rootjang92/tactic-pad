import { useEffect, useRef, useState } from "react";
import { useTacticStore } from "@/stores/useTacticStore";

export function useAutoSave() {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUpdatedAt = useRef<string>("");

  useEffect(() => {
    const unsub = useTacticStore.subscribe((state) => {
      const updatedAt = state.project.updatedAt;
      if (updatedAt === prevUpdatedAt.current) return;
      prevUpdatedAt.current = updatedAt;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);

      timeoutRef.current = setTimeout(() => {
        setSaveStatus("saved");
        fadeRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
      }, 500);
    });

    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  return saveStatus;
}
