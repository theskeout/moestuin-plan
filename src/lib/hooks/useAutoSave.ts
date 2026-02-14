"use client";

import { useEffect, useRef } from "react";

export function useAutoSave(
  hasChanges: boolean,
  save: () => void,
  delayMs: number = 2000
) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!hasChanges) return;

    // Reset timer bij elke wijziging — sla op na delayMs stilte
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveRef.current();
    }, delayMs);

    return () => clearTimeout(timerRef.current);
  }, [hasChanges, save, delayMs]);
}
