import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { StoreInit } from "@/components/shared/StoreInit";
import { CreativeDetailModal } from "@/components/creatives/CreativeDetailModal";
import { SessionProvider } from "@/lib/auth/session-context";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";

  return (
    <SessionProvider
      user={{
        id: user.id,
        email: user.email ?? "",
        displayName,
        workspaceId: user.id,
        createdAt: user.created_at,
      }}
    >
      <StoreInit />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1320px] px-6 pb-16 pt-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <CreativeDetailModal />
    </SessionProvider>
  );
}
