"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { MemberInfo, InviteInfo } from "@/lib/garden/types";
import {
  loadGardenMembers,
  inviteMember,
  removeMember,
  leaveGarden,
  transferOwnership,
  loadPendingInvites,
  cancelInvite,
} from "@/lib/storage/members";
import { Crown, UserMinus, LogOut, Copy, Check, Send, X, ArrowRightLeft } from "lucide-react";

interface MemberManagerProps {
  gardenId: string;
  gardenName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: "owner" | "member";
  onLeave?: () => void;
}

export default function MemberManager({
  gardenId,
  gardenName,
  open,
  onOpenChange,
  currentRole,
  onLeave,
}: MemberManagerProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!gardenId) return;
    setLoading(true);
    try {
      const [m, i] = await Promise.all([
        loadGardenMembers(gardenId),
        currentRole === "owner" ? loadPendingInvites(gardenId) : Promise.resolve([]),
      ]);
      setMembers(m);
      setInvites(i);
    } catch (err) {
      console.error("MemberManager loadData error:", err);
    }
    setLoading(false);
  }, [gardenId, currentRole]);

  useEffect(() => {
    if (open) {
      loadData();
      setInviteEmail("");
      setInviteError(null);
      setInviteSuccess(null);
      setConfirmTransfer(null);
      setConfirmLeave(false);
    }
  }, [open, loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const invite = await inviteMember(gardenId, inviteEmail);
      setInviteSuccess(`Uitnodiging verstuurd. Deel de link met ${invite.email}.`);
      setInviteEmail("");
      setInvites((prev) => [invite, ...prev]);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Kon niet uitnodigen");
    }
    setSending(false);
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/uitnodiging/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(gardenId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      // silently fail
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      // silently fail
    }
  };

  const handleTransfer = async (newOwnerId: string) => {
    try {
      await transferOwnership(gardenId, newOwnerId);
      setConfirmTransfer(null);
      loadData();
    } catch {
      // silently fail
    }
  };

  const handleLeave = async () => {
    try {
      await leaveGarden(gardenId);
      onOpenChange(false);
      onLeave?.();
    } catch {
      // silently fail
    }
  };

  const isOwner = currentRole === "owner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leden van {gardenName}</DialogTitle>
          <DialogDescription>
            {isOwner ? "Beheer leden en nodig anderen uit" : "Bekijk de leden van deze tuin"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Laden...</p>
        ) : (
          <div className="space-y-6">
            {/* Ledenlijst */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Leden</h4>
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.role === "owner" && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                    <span className="text-sm truncate">{m.email || m.userId.slice(0, 8)}</span>
                    {m.userId === user?.id && (
                      <span className="text-xs text-muted-foreground">(jij)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                    {isOwner && m.userId !== user?.id && m.role !== "owner" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setConfirmTransfer(m.userId)}
                          title="Eigendom overdragen"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(m.userId)}
                          title="Lid verwijderen"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bevestiging eigendom overdragen */}
            {confirmTransfer && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                <p className="text-sm font-medium">Eigendom overdragen?</p>
                <p className="text-xs text-muted-foreground">
                  Je wordt lid in plaats van eigenaar. Dit kan niet ongedaan worden gemaakt.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => handleTransfer(confirmTransfer)}>
                    Overdragen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmTransfer(null)}>
                    Annuleren
                  </Button>
                </div>
              </div>
            )}

            {/* Uitnodigen (alleen owner) */}
            {isOwner && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Uitnodigen</h4>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@voorbeeld.nl"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" size="sm" disabled={sending}>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {sending ? "..." : "Stuur"}
                  </Button>
                </form>
                {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
                {inviteSuccess && <p className="text-xs text-green-600">{inviteSuccess}</p>}
              </div>
            )}

            {/* Openstaande uitnodigingen */}
            {isOwner && invites.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Openstaande uitnodigingen</h4>
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm truncate">{inv.email}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopyLink(inv.token)}
                        title="Kopieer uitnodigingslink"
                      >
                        {copiedToken === inv.token ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvite(inv.id)}
                        title="Uitnodiging intrekken"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tuin verlaten (alleen member) */}
            {!isOwner && (
              <div className="pt-2 border-t">
                {confirmLeave ? (
                  <div className="space-y-2">
                    <p className="text-sm">Weet je zeker dat je deze tuin wilt verlaten?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={handleLeave}>
                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        Verlaten
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmLeave(false)}>
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmLeave(true)}>
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Tuin verlaten
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
