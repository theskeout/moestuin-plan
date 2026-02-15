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
import { Garden, InviteInfo } from "@/lib/garden/types";
import { loadMyInvites, acceptInviteByToken } from "@/lib/storage/members";
import { Trash2, Users } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    if (user) {
      try {
        const myInvites = await loadMyInvites();
        setInvites(myInvites);
      } catch {
        setInvites([]);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading, loadData]);

  const handleCreate = (name: string, widthCm: number, heightCm: number, postcode: string) => {
    const params = new URLSearchParams({
      name,
      w: String(widthCm),
      h: String(heightCm),
    });
    if (postcode) params.set("pc", postcode);
    router.push(`/tuin?${params.toString()}`);
  };

  const handleLoad = (garden: Garden) => {
    router.push(`/tuin?id=${garden.id}`);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    setDeleteConfirm(null);
    await deleteGardenAsync(id);
    const data = await loadGardensAsync();
    setGardens(data);
  };

  const handleAcceptInvite = async (token: string) => {
    setAcceptingInvite(token);
    try {
      const gardenId = await acceptInviteByToken(token);
      router.push(`/tuin?id=${gardenId}`);
    } catch {
      setAcceptingInvite(null);
    }
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
            ) : (
              <>
                {invites.length > 0 && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Uitnodigingen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {invites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{inv.gardenName || "Tuin"}</p>
                            <p className="text-sm text-muted-foreground">
                              Uitgenodigd als lid
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvite(inv.token)}
                            disabled={acceptingInvite === inv.token}
                          >
                            {acceptingInvite === inv.token ? "Bezig..." : "Accepteren"}
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {gardens.length > 0 ? (
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{g.name}</p>
                              {g.role === "member" && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  Gedeeld
                                </span>
                              )}
                              {g.memberCount && g.memberCount > 1 && (
                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {g.memberCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {(g.widthCm / 100).toFixed(1)} x{" "}
                              {(g.heightCm / 100).toFixed(1)}m — {(g.zones || []).length}{" "}
                              zones
                            </p>
                          </button>
                          {g.role !== "member" && (
                            deleteConfirm === g.id ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(g.id)}
                                  className="text-xs h-7"
                                >
                                  Verwijder
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-xs h-7"
                                >
                                  Annuleer
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(g.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </div>
        )}

        {user && <MigrationDialog onComplete={loadData} />}
      </div>
    </main>
  );
}
