"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GardenSetupProps {
  onSubmit: (name: string, widthCm: number, heightCm: number) => void;
}

export default function GardenSetup({ onSubmit }: GardenSetupProps) {
  const [name, setName] = useState("Mijn Moestuin");
  const [widthCm, setWidthCm] = useState(300);
  const [heightCm, setHeightCm] = useState(1000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (widthCm >= 50 && heightCm >= 50 && name.trim()) {
      onSubmit(name.trim(), widthCm, heightCm);
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

          <Button type="submit" className="w-full">
            Tuin aanmaken
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
