import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getAdminId(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer (.+)$/i);
  if (!match) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase auth server configuration is missing");

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });
  const { data, error } = await authClient.auth.getUser(match[1]);
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await authClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) throw new Error("Unable to verify admin profile");
  if (!profile || profile.role !== "admin" || !profile.is_active) return null;

  return data.user.id;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin server configuration is missing");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  let adminId: string | null;
  try {
    adminId = await getAdminId(request);
  } catch {
    return jsonError("Konfigurasi autentikasi server belum lengkap.", 500);
  }
  if (!adminId) return jsonError("Hanya admin aktif yang dapat mengundang pengguna.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format permintaan tidak valid.", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("Data pengguna tidak valid.", 400);
  }

  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const displayName =
    typeof input.display_name === "string" ? input.display_name.trim() : "";
  const username =
    typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
  const role = input.role;

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    displayName.length < 1 ||
    displayName.length > 100 ||
    !/^[a-z0-9_]{3,32}$/.test(username) ||
    (role !== "admin" && role !== "kasir" && role !== "user")
  ) {
    return jsonError("Periksa email, nama, username, dan role yang dipilih.", 400);
  }

  let serviceClient;
  try {
    serviceClient = getServiceClient();
  } catch {
    return jsonError("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.", 500);
  }

  const { data: duplicate, error: duplicateError } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (duplicateError) return jsonError("Gagal memeriksa username.", 500);
  if (duplicate) return jsonError("Username sudah digunakan.", 409);

  const origin = request.nextUrl.origin;
  const { data: inviteData, error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName, username },
      redirectTo: `${origin}/auth/setup-password`,
    });

  if (inviteError || !inviteData.user) {
    return jsonError("Undangan gagal dikirim. Periksa email dan konfigurasi SMTP.", 400);
  }

  const { data: invitedProfile, error: lookupError } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("id", inviteData.user.id)
    .maybeSingle();

  if (lookupError || !invitedProfile) {
    return jsonError(
      "Undangan terkirim, tetapi profil belum dapat ditemukan. Periksa trigger profil Supabase.",
      202
    );
  }

  const { error: roleError } = await serviceClient
    .from("profiles")
    .update({ role })
    .eq("id", invitedProfile.id);

  if (roleError) {
    return jsonError(
      "Undangan terkirim, tetapi role belum dapat diatur. Atur role setelah profil dibuat.",
      202
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  let adminId: string | null;
  try {
    adminId = await getAdminId(request);
  } catch {
    return jsonError("Konfigurasi autentikasi server belum lengkap.", 500);
  }
  if (!adminId) return jsonError("Hanya admin aktif yang dapat menonaktifkan pengguna.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format permintaan tidak valid.", 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as Record<string, unknown>).user_id !== "string"
  ) {
    return jsonError("ID pengguna tidak valid.", 400);
  }

  const targetId = (body as { user_id: string }).user_id;
  if (targetId === adminId) {
    return jsonError("Akun admin yang sedang digunakan tidak dapat dinonaktifkan.", 400);
  }

  let serviceClient;
  try {
    serviceClient = getServiceClient();
  } catch {
    return jsonError("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.", 500);
  }

  const { data: target, error: targetError } = await serviceClient
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", targetId)
    .maybeSingle();
  if (targetError) return jsonError("Gagal memeriksa pengguna.", 500);
  if (!target || !target.is_active) return jsonError("Pengguna tidak ditemukan.", 404);

  const { data: authUser, error: authUserError } =
    await serviceClient.auth.admin.getUserById(targetId);
  if (authUserError || !authUser.user) {
    return jsonError("Akun autentikasi tidak ditemukan.", 404);
  }

  const { error: deactivateError } = await serviceClient.rpc(
    "admin_deactivate_profile",
    { p_target_user_id: targetId }
  );
  if (deactivateError) {
    return jsonError(
      deactivateError.code === "23514"
        ? "Admin terakhir tidak dapat dinonaktifkan."
        : "Profil gagal dinonaktifkan.",
      deactivateError.code === "23514" ? 400 : 500
    );
  }

  const { error: banError } = await serviceClient.auth.admin.updateUserById(
    targetId,
    { ban_duration: "876000h" }
  );
  if (banError) {
    const { error: restoreError } = await serviceClient
      .from("profiles")
      .update({ is_active: true })
      .eq("id", targetId);
    if (restoreError) {
      return jsonError(
        "Profil sudah dinonaktifkan tetapi sesi Auth gagal dicabut dan pemulihan profil gagal. Periksa akun ini di Supabase Dashboard.",
        500
      );
    }
    return jsonError("Sesi pengguna gagal dinonaktifkan. Akun tetap aktif.", 500);
  }

  return NextResponse.json({ ok: true });
}
