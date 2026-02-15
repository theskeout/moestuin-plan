"use client";

import { useState } from "react";
import { Garden } from "@/lib/garden/types";
import { getPlant } from "@/lib/plants/catalog";
import { getPlantFamily } from "@/lib/planning/families";
import { getPositionHistory } from "@/lib/planning/rotation";
import { SeasonArchive, RotationWarning } from "@/lib/planning/types";
import { AlertTriangle, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RotationHistoryProps {
  garden: Garden;
  archives: SeasonArchive[];
  rotationWarnings: RotationWarning[];
  onArchiveSeason: (year: number) => void;
  onDeleteArchive: (year: number) => void;
}

export default function RotationHistory({
  garden,
  archives,
  rotationWarnings,
  onArchiveSeason,
  onDeleteArchive,
}: RotationHistoryProps) {
  const currentYear = new Date().getFullYear();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Archiveer seizoen */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Seizoen archiveren</h3>
        <p className="text-xs text-muted-foreground">
          Sla de huidige tuinindeling op als archief. Dit wordt gebruikt om gewasrotatie te controleren.
        </p>
        {confirmArchive ? (
          <div className="flex items-center gap-2">
            <p className="text-xs">Seizoen {currentYear} archiveren?</p>
            <Button
              size="sm"
              onClick={() => {
                onArchiveSeason(currentYear);
                setConfirmArchive(false);
              }}
            >
              Bevestig
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmArchive(false)}
            >
              Annuleer
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmArchive(true)}
            className="gap-1.5"
          >
            <Archive className="h-3.5 w-3.5" />
            Archiveer seizoen {currentYear}
          </Button>
        )}
      </div>

      {/* Rotatie-waarschuwingen */}
      {rotationWarnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-600">Rotatie-waarschuwingen</h3>
          <div className="space-y-2">
            {rotationWarnings.map((w) => (
              <div
                key={w.zoneId}
                className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 text-sm"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{w.plantName}</p>
                  <p className="text-xs text-muted-foreground">
                    Familie: {w.familyName}. In {w.conflictYear} stond hier: {w.conflictPlant}.
                    Aanbevolen rotatie: {w.rotationYears} jaar.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per zone: geschiedenis */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Huidige zones</h3>
        {garden.zones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen zones in deze tuin</p>
        ) : (
          <div className="space-y-2">
            {garden.zones.map((zone) => {
              const plant = getPlant(zone.plantId);
              const family = getPlantFamily(zone.plantId);
              const history = getPositionHistory(
                zone.x, zone.y, zone.widthCm, zone.heightCm, archives
              );

              return (
                <div key={zone.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{plant?.icon}</span>
                    <span className="text-sm font-medium">{plant?.name}</span>
                    {family && (
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-accent rounded">
                        {family.name}
                      </span>
                    )}
                  </div>
                  {history.length > 0 ? (
                    <div className="ml-6">
                      <p className="text-xs text-muted-foreground mb-1">Voorgaande seizoenen:</p>
                      {history.map((h) => (
                        <div key={h.year} className="flex items-center gap-2 text-xs py-0.5">
                          <span className="font-medium w-10">{h.year}</span>
                          <span>{h.plantName}</span>
                          {h.familyId === family?.id && (
                            <span className="text-amber-500 font-medium">Zelfde familie!</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground ml-6">Geen geschiedenis</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archieven */}
      {archives.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Opgeslagen archieven</h3>
          <div className="space-y-1">
            {archives.map((archive) => (
              <div
                key={archive.id}
                className="flex items-center justify-between px-3 py-2 border rounded-md"
              >
                <div>
                  <span className="text-sm font-medium">Seizoen {archive.seasonYear}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {archive.zones.length} zones
                  </span>
                </div>
                {confirmDelete === archive.seasonYear ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="destructive" onClick={() => {
                      onDeleteArchive(archive.seasonYear);
                      setConfirmDelete(null);
                    }}>
                      Verwijder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                      Annuleer
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(archive.seasonYear)}
                    className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
