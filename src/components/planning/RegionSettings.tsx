"use client";

import { useState, useCallback, useEffect } from "react";
import { UserSettings } from "@/lib/planning/types";
import { getStationByPostcode, getLastFrostDate, getFirstFrostDate } from "@/lib/planning/frost";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Thermometer } from "lucide-react";

const MONTH_NAMES = ["", "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth() + 1]}`;
}

interface RegionSettingsProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export default function RegionSettings({ settings, onSave }: RegionSettingsProps) {
  const [postcode, setPostcode] = useState(settings.postcode || "");
  const [offset, setOffset] = useState(settings.frostOffsetDays ?? 0);
  const [saved, setSaved] = useState(false);

  // Sync lokale state als settings van buitenaf wijzigen (bijv. na async laden)
  useEffect(() => {
    setPostcode(settings.postcode || "");
    setOffset(settings.frostOffsetDays ?? 0);
  }, [settings.postcode, settings.frostOffsetDays]);

  // Station automatisch afleiden uit postcode
  const digits = postcode.replace(/\D/g, "");
  const station = digits.length >= 4 ? getStationByPostcode(digits) : null;
  const stationCode = station?.code || "";

  const handleSave = useCallback(() => {
    onSave({
      postcode: postcode || undefined,
      frostOffsetDays: offset,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [postcode, offset, onSave]);

  // Bereken vorstdata voor afgeleid station
  const year = new Date().getFullYear();
  const lastFrost = stationCode ? getLastFrostDate(stationCode, year) : null;
  const firstFrost = stationCode ? getFirstFrostDate(stationCode, year) : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Regio-instelling</h3>
        <p className="text-xs text-muted-foreground">
          Stel je postcode in om zaai- en oogsttijden aan te passen aan je regio.
          Het dichtstbijzijnde KNMI-station wordt automatisch bepaald.
        </p>
      </div>

      {/* Postcode */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Postcode
        </label>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="bijv. 3511 AB"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="pl-8"
            maxLength={7}
          />
        </div>
      </div>

      {/* Vorstdata weergave */}
      {station && lastFrost && firstFrost ? (
        <div className="bg-accent/50 rounded-md p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{station.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Laatste vorst (gem.)</p>
              <p className="font-medium">{formatDate(lastFrost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Eerste vorst (gem.)</p>
              <p className="font-medium">{formatDate(firstFrost)}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Geen postcode ingesteld — standaard wordt De Bilt gebruikt.
        </p>
      )}

      {/* Handmatige correctie */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Handmatige correctie (dagen)
        </label>
        <p className="text-xs text-muted-foreground">
          Positief = later zaaien (bijv. koude tuin), negatief = eerder (beschutte tuin)
        </p>
        <Input
          type="number"
          value={offset}
          onChange={(e) => setOffset(Number(e.target.value))}
          min={-30}
          max={30}
          className="w-32"
        />
      </div>

      {/* Opslaan */}
      <Button onClick={handleSave} size="sm" variant={saved ? "secondary" : "default"}>
        {saved ? "Opgeslagen!" : "Opslaan"}
      </Button>
    </div>
  );
}
