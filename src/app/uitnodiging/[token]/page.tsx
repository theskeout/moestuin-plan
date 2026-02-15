"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { acceptInviteByToken } from "@/lib/storage/members";

export default function UitnodigingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const token = params.token as string;

  const [invite, setInvite] = useState<{
    garden_name: string;
    email: string;
    status: string;
    garden_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("garden_invites")
        .select("email, status, garden_id, gardens(name)")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setError("Uitnodiging niet gevonden");
        setLoading(false);
        return;
      }

      // gardens is een object (single FK join) of null
      const gardenData = data.gardens as unknown as { name: string } | null;
      setInvite({
        email: data.email,
        status: data.status,
        garden_id: data.garden_id,
        garden_name: gardenData?.name || "Onbekende tuin",
      });
      setLoading(false);
    }

    loadInvite();
  }, [token]);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    setError(null);
    try {
      const gardenId = await acceptInviteByToken(token);
      router.push(`/tuin?id=${gardenId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon uitnodiging niet accepteren");
      setAccepting(false);
    }
  }, [token, router]);

  if (loading || authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-stone-50">
        <p className="text-muted-foreground">Laden...</p>
      </main>
    );
  }

  if (error && !invite) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-stone-50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Uitnodiging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
              Naar startpagina
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (invite?.status === "accepted") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-stone-50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Al geaccepteerd</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Deze uitnodiging voor <strong>{invite.garden_name}</strong> is al geaccepteerd.
            </p>
            <Button className="w-full" onClick={() => router.push(`/tuin?id=${invite.garden_id}`)}>
              Open tuin
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-stone-50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Uitnodiging voor {invite?.garden_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Je bent uitgenodigd om samen te werken aan deze tuin. Log in of maak een account aan om de uitnodiging te accepteren.
            </p>
            <Button className="w-full" onClick={() => router.push(`/login?redirect=/uitnodiging/${token}`)}>
              Inloggen
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-stone-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Uitnodiging voor {invite?.garden_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Je bent uitgenodigd als lid van deze tuin. Na accepteren kun je zones en structuren toevoegen en bewerken.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleAccept} disabled={accepting}>
            {accepting ? "Accepteren..." : "Uitnodiging accepteren"}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
            Annuleren
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
