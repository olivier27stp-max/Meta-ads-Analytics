"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AlertCircle, ArrowRight, KeyRound } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [secretCode, setSecretCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName, secretCode }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(errorMessage(body.error));
        setLoading(false);
        return;
      }
      router.replace("/accounts");
      router.refresh();
    } catch {
      setError("Something went wrong. Please retry.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-[13px] text-muted-foreground">
          Registration is gated by an invite code. Each account gets a fully isolated workspace.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5">
          <div className="flex items-center gap-2 text-[12px] font-medium text-warning">
            <KeyRound className="h-3.5 w-3.5" />
            Invite-only registration
          </div>
          <p className="mt-0.5 text-[12px] text-warning/90">
            You&apos;ll need a secret code from the workspace owner to continue.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Full name</Label>
            <Input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Password</Label>
          <Input
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="text-[11px] text-muted-foreground">Minimum 8 characters.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Invite code</Label>
          <Input
            required
            type="password"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            placeholder="Secret code"
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={loading}>
          {loading ? "Creating workspace…" : "Create workspace"}
          <ArrowRight />
        </Button>
      </form>
      <div className="mt-5 border-t border-border pt-4 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

function errorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_secret_code":
      return "Invite code is invalid. Ask the workspace owner for a valid code.";
    case "email_taken":
      return "An account with this email already exists.";
    case "invalid_input":
      return "Please check the fields — password must be at least 8 characters.";
    default:
      return "Couldn't create your workspace.";
  }
}
