import { NextRequest } from "next/server";
import { verifyIdToken } from "./firebase/admin";
import { supabaseAdmin } from "./supabase/server";

export async function getUserFromRequest(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const decoded = await verifyIdToken(token);
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", decoded.uid)
      .single();
    if (!user) {
      await supabaseAdmin.from("users").insert({
        id: decoded.uid,
        email: decoded.email!,
        display_name: decoded.name ?? null,
      });
      return { id: decoded.uid, email: decoded.email!, plan: "free" as const };
    }
    return user;
  } catch {
    return null;
  }
}
