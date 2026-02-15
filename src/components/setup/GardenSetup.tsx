"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Thermometer } from "lucide-react";
import { getStationByPostcode, getLastFrostDate, getFirstFrostDate } from "@/lib/planning/frost";

const MONTH_NAMES = ["", "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth() + 1]}`;
}

interface GardenSetupProps {
  onSubmit: (name: string, widthCm: number, heightCm: number, postcode: string) => void;
}

export default function GardenSetup({ onSubmit }: GardenSetupProps) {
  const [name, setName] = useState("Mijn Moestuin");
  const [widthCm, setWidthCm] = useState(300);
  const [heightCm, setHeightCm] = useState(1000);
  const [postcode, setPostcode] = useState("");

  const station = postcode.replace(/\D/g, "").length >= 4
    ? getStationByPostcode(postcode)
    : null;
  const year = new Date().getFullYear();
  const lastFrost = station ? getLastFrostDate(station.code, year) : null;
  const firstFrost = station ? getFirstFrostDate(station.code, year) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (widthCm >= 50 && heightCm >= 50 && name.trim()) {
      onSubmit(name.trim(), widthCm, heightCm, postcode.trim());
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Nieuwe moestuin</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mijn Moestuin"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Breedte (cm)</Label>
              <Input
                id="width"
                type="number"
                min={50}
                max={5000}
                step={10}
                value={widthCm}
                onChange={(e) => setWidthCm(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Lengte (cm)</Label>
              <Input
                id="height"
                type="number"
                min={50}
                max={5000}
                step={10}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Oppervlakte: {((widthCm * heightCm) / 10000).toFixed(1)} m²
          </p>

          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="postcode"
                placeholder="bijv. 3511 AB"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="pl-8"
                maxLength={7}
              />
            </div>
            {station && lastFrost && firstFrost ? (
              <div className="bg-accent/50 rounded-md p-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium">{station.name}</span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Laatste vorst: <span className="font-medium text-foreground">{formatDate(lastFrost)}</span></span>
                  <span>Eerste vorst: <span className="font-medium text-foreground">{formatDate(firstFrost)}</span></span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optioneel — standaard wordt De Bilt gebruikt
              </p>
            )}
          </div>

          <Button type="submit" className="w-full">
            Tuin aanmaken
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
