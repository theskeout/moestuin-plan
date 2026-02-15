import { createClient } from "@/lib/supabase/client";
import { MemberInfo, InviteInfo } from "@/lib/garden/types";

function getSupabase() {
  return createClient();
}

export async function loadGardenMembers(gardenId: string): Promise<MemberInfo[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("garden_members")
    .select("id, user_id, role, created_at")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Huidige user email kennen we direct
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Haal alle invites op voor deze tuin (accepted) om emails te koppelen
  const { data: allInvites } = await supabase
    .from("garden_invites")
    .select("email")
    .eq("garden_id", gardenId)
    .eq("status", "accepted");

  const inviteEmails = (allInvites || []).map((i) => i.email);

  return (data || []).map((m) => {
    let email = "";
    if (currentUser && m.user_id === currentUser.id) {
      email = currentUser.email || "";
    } else if (m.role === "member" && inviteEmails.length > 0) {
      // Members kwamen binnen via invites — toon invite email
      // Eerste member is de eerste invite, etc. (benaderend)
      const memberIndex = (data || [])
        .filter((x) => x.role === "member")
        .findIndex((x) => x.id === m.id);
      if (memberIndex >= 0 && memberIndex < inviteEmails.length) {
        email = inviteEmails[memberIndex];
      }
    }

    return {
      id: m.id,
      userId: m.user_id,
      email,
      role: m.role as "owner" | "member",
      createdAt: m.created_at,
    };
  });
}

export async function inviteMember(gardenId: string, email: string): Promise<InviteInfo> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const { data, error } = await supabase
    .from("garden_invites")
    .insert({
      garden_id: gardenId,
      email: email.toLowerCase().trim(),
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Deze persoon is al uitgenodigd");
    throw new Error(error.message || "Kon niet uitnodigen");
  }

  return {
    id: data.id,
    gardenId: data.garden_id,
    email: data.email,
    token: data.token,
    status: data.status,
    createdAt: data.created_at,
  };
}

export async function acceptInviteByToken(token: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) throw error;
  return data as string; // garden_id
}

export async function removeMember(gardenId: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("garden_members")
    .delete()
    .eq("garden_id", gardenId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function leaveGarden(gardenId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const { error } = await supabase
    .from("garden_members")
    .delete()
    .eq("garden_id", gardenId)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function transferOwnership(gardenId: string, newOwnerId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("transfer_garden_ownership", {
    p_garden_id: gardenId,
    p_new_owner_id: newOwnerId,
  });
  if (error) throw error;
}

export async function loadPendingInvites(gardenId: string): Promise<InviteInfo[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("garden_invites")
    .select("*")
    .eq("garden_id", gardenId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    gardenId: row.garden_id,
    email: row.email,
    token: row.token,
    status: row.status as "pending" | "accepted",
    createdAt: row.created_at,
  }));
}

export async function loadMyInvites(): Promise<InviteInfo[]> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const { data, error } = await supabase
    .from("garden_invites")
    .select("*, gardens(name)")
    .eq("email", user.email.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    gardenId: row.garden_id as string,
    gardenName: (row.gardens as { name: string } | null)?.name,
    email: row.email as string,
    token: row.token as string,
    status: row.status as "pending" | "accepted",
    createdAt: row.created_at as string,
  }));
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("garden_invites")
    .delete()
    .eq("id", inviteId);

  if (error) throw error;
}
