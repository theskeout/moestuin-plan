"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GardenSetup from "@/components/setup/GardenSetup";
import { loadGardensAsync, deleteGardenAsync } from "@/lib/garden/storage";
import { refreshPlantCache } from "@/lib/plants/catalog";
import { setStorageBackend } from "@/lib/storage";
import { useAuth } from "@/components/auth/AuthProvider";
import UserMenu from "@/components/auth/UserMenu";
import MigrationDialog from "@/components/auth/MigrationDialog";
import { Garden } from "@/lib/garden/types";
import { Trash2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (user) {
      setStorageBackend("supabase", user.id);
    } else {
      setStorageBackend("local");
    }
    await refreshPlantCache();
    const data = await loadGardensAsync();
    setGardens(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading, loadData]);

  const handleCreate = (name: string, widthCm: number, heightCm: number) => {
    const params = new URLSearchParams({
      name,
      w: String(widthCm),
      h: String(heightCm),
    });
    router.push(`/tuin?${params.toString()}`);
  };

  const handleLoad = (garden: Garden) => {
    router.push(`/tuin?id=${garden.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteGardenAsync(id);
    const data = await loadGardensAsync();
    setGardens(data);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-stone-50">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-end">
            <UserMenu />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Moestuin Planner</h1>
          <p className="text-muted-foreground">
            Plan je moestuin op een interactief 10x10cm raster
          </p>
        </div>

        {showSetup ? (
          <div className="flex flex-col items-center gap-3">
            <GardenSetup onSubmit={handleCreate} />
            <Button variant="ghost" onClick={() => setShowSetup(false)}>
              Terug
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={() => setShowSetup(true)}
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            >
              Nieuwe tuin aanmaken
            </Button>

            {loading ? (
              <p className="text-sm text-muted-foreground text-center">Tuinen laden...</p>
            ) : gardens.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Opgeslagen tuinen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {gardens.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <button
                        onClick={() => handleLoad(g)}
                        className="flex-1 text-left"
                      >
                        <p className="font-medium">{g.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(g.widthCm / 100).toFixed(1)} x{" "}
                          {(g.heightCm / 100).toFixed(1)}m — {(g.zones || []).length}{" "}
                          zones
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(g.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {user && <MigrationDialog onComplete={loadData} />}
      </div>
    </main>
  );
}
