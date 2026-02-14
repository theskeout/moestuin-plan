"use client";

import { CompanionCheck } from "@/lib/plants/companions";
import { ThumbsUp, AlertTriangle } from "lucide-react";

interface CompanionAlertProps {
  checks: CompanionCheck[];
}

export default function CompanionAlert({ checks }: CompanionAlertProps) {
  if (checks.length === 0) return null;

  const bad = checks.filter((c) => c.type === "bad");
  const good = checks.filter((c) => c.type === "good");

  return (
    <div className="space-y-2">
      {bad.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Slechte buren
          </div>
          {bad.map((c, i) => (
            <p key={i} className="text-sm text-red-600">
              {c.plantA.icon} {c.plantA.name} — {c.plantB.icon} {c.plantB.name}
            </p>
          ))}
        </div>
      )}
      {good.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <ThumbsUp className="h-4 w-4" />
            Goede buren
          </div>
          {good.map((c, i) => (
            <p key={i} className="text-sm text-green-600">
              {c.plantA.icon} {c.plantA.name} — {c.plantB.icon} {c.plantB.name}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
