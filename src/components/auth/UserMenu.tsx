"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogIn, LogOut } from "lucide-react";

export default function UserMenu() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/login")}
      >
        <LogIn className="h-3.5 w-3.5 mr-1.5" />
        Inloggen
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground truncate max-w-[150px]">
        {user.email}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
      >
        <LogOut className="h-3.5 w-3.5 mr-1.5" />
        Uitloggen
      </Button>
    </div>
  );
}
