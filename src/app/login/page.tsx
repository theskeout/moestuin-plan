"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isRegister) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess("Account aangemaakt! Check je e-mail om je account te bevestigen.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-stone-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isRegister ? "Registreren" : "Inloggen"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="je@email.nl"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Wachtwoord</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 6 tekens"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-600">{success}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Bezig..." : isRegister ? "Registreren" : "Inloggen"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); setSuccess(null); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isRegister ? "Al een account? Inloggen" : "Geen account? Registreren"}
            </button>
          </div>

          <div className="mt-3 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Doorgaan als gast
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
