import { redirect } from "next/navigation";

import { DEMO_USER } from "@/lib/demo";
import { flags } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!flags.hasSupabasePublic) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function requireUser() {
  if (!flags.hasSupabasePublic) {
    return DEMO_USER;
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
