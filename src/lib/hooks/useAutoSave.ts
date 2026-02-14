"use client";

import { useEffect, useRef } from "react";

export function useAutoSave(
  hasChanges: boolean,
  save: () => void,
  intervalMs: number = 5000
) {
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!hasChanges) return;

    const timer = setInterval(() => {
      saveRef.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [hasChanges, intervalMs]);
}
