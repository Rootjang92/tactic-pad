import { useEffect, useRef, useState } from "react";
import { useTacticStore } from "@/stores/useTacticStore";
import { saveProject } from "@/lib/db";

export function useAutoSave() {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUpdatedAt = useRef<string>("");

  useEffect(() => {
    const unsub = useTacticStore.subscribe((state) => {
      const { project } = state;
      if (project.updatedAt === prevUpdatedAt.current) return;
      prevUpdatedAt.current = project.updatedAt;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);

      setSaveStatus("saving");

      // 500ms debounce → IndexedDB 저장
      debounceRef.current = setTimeout(async () => {
        try {
          await saveProject(project);
          setSaveStatus("saved");
          fadeRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
        } catch (e) {
          console.error("IndexedDB save failed:", e);
          setSaveStatus("error");
        }
      }, 500);
    });

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  return saveStatus;
}
