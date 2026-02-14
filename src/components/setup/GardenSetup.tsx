"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GardenSetupProps {
  onSubmit: (name: string, widthM: number, heightM: number) => void;
}

export default function GardenSetup({ onSubmit }: GardenSetupProps) {
  const [name, setName] = useState("Mijn Moestuin");
  const [widthM, setWidthM] = useState(3);
  const [heightM, setHeightM] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (widthM > 0 && heightM > 0 && name.trim()) {
      onSubmit(name.trim(), widthM, heightM);
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
              <Label htmlFor="width">Breedte (m)</Label>
              <Input
                id="width"
                type="number"
                min={0.5}
                max={50}
                step={0.5}
                value={widthM}
                onChange={(e) => setWidthM(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Lengte (m)</Label>
              <Input
                id="height"
                type="number"
                min={0.5}
                max={50}
                step={0.5}
                value={heightM}
                onChange={(e) => setHeightM(Number(e.target.value))}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Oppervlakte: {(widthM * heightM).toFixed(1)} m²
          </p>

          <Button type="submit" className="w-full">
            Tuin aanmaken
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
