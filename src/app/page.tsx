import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/accounts" : "/login");
}
