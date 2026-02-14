"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { hasLocalData, wasMigrated, migrateLocalDataToSupabase } from "@/lib/supabase/migration";

interface MigrationDialogProps {
  onComplete: () => void;
}

export default function MigrationDialog({ onComplete }: MigrationDialogProps) {
  const [open, setOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasLocalData() && !wasMigrated()) {
      setOpen(true);
    }
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    setError(null);
    try {
      await migrateLocalDataToSupabase();
      setOpen(false);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Migratie mislukt");
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lokale data gevonden</DialogTitle>
          <DialogDescription>
            Er staan tuinen en/of gewassen in je browser. Wil je deze importeren naar je account?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleMigrate} disabled={migrating} className="flex-1">
              {migrating ? "Importeren..." : "Importeren"}
            </Button>
            <Button variant="outline" onClick={handleSkip} disabled={migrating}>
              Overslaan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Je lokale data blijft behouden, ook als je overslaat.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
