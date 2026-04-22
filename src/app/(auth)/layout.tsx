import { Activity } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-10">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold tracking-tight">
              Entiore Sales Dashboard
            </span>
            <span className="text-[11px] text-muted-foreground">
              Creative intelligence · Attribution · Calendar
            </span>
          </div>
        </div>
        {children}
        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Internal tool for paid social + SaaS sales teams.
        </p>
      </div>
    </div>
  );
}
