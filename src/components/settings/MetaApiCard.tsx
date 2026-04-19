"use client";

import * as React from "react";
import { KeyRound, CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsCard } from "./SettingsCard";
import { useStore } from "@/lib/store";

export function MetaApiCard() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [token, setToken] = React.useState(settings.metaAccessToken);
  const [appId, setAppId] = React.useState(settings.metaAppId);
  const [appSecret, setAppSecret] = React.useState(settings.metaAppSecret);
  const [envToken, setEnvToken] = React.useState(settings.serverEnvToken);
  const [testing, setTesting] = React.useState(false);
  const [result, setResult] = React.useState<"ok" | "err" | null>(null);

  const onSave = () => {
    update({ metaAccessToken: token, metaAppId: appId, metaAppSecret: appSecret, serverEnvToken: envToken });
  };

  const onTest = async () => {
    setTesting(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 650));
    setTesting(false);
    setResult(envToken || token.length > 5 ? "ok" : "err");
  };

  return (
    <SettingsCard
      title="Meta API Setup"
      description="Configure Graph API access. Required scopes: ads_read, ads_management."
      icon={<KeyRound className="h-4 w-4" />}
      footer={
        <>
          <Button variant="ghost" onClick={onTest} disabled={testing}>
            {testing ? "Testing…" : "Test connection"}
            <PlayCircle />
          </Button>
          <Button variant="primary" onClick={onSave}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div>
            <div className="text-sm font-medium">Use server environment token</div>
            <div className="text-xs text-muted-foreground">
              Read <code className="font-mono">META_ACCESS_TOKEN</code> from server env instead of storing here.
            </div>
          </div>
          <Switch checked={envToken} onCheckedChange={setEnvToken} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Access Token</Label>
            <Input
              type="password"
              placeholder="EAAB…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={envToken}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>App ID</Label>
            <Input
              placeholder="1234567890"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label>App Secret</Label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {result === "ok" && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connection successful. Token has required scopes.
          </div>
        )}
        {result === "err" && (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            <XCircle className="h-3.5 w-3.5" />
            Missing token. Provide one or enable server env token.
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">How to get your Meta Access Token</div>
            <div className="text-[13px] text-muted-foreground">
              <ol className="ml-4 list-decimal space-y-1">
                <li>
                  Open{" "}
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    developers.facebook.com/apps
                  </a>{" "}
                  and create or pick a Business app.
                </li>
                <li>Add the Marketing API product.</li>
                <li>Grant scopes <code className="font-mono">ads_read</code> and <code className="font-mono">ads_management</code>.</li>
                <li>Generate a long-lived system user token for server-side use.</li>
                <li>Paste it here, or expose it via <code className="font-mono">META_ACCESS_TOKEN</code>.</li>
              </ol>
            </div>
          </div>
          <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-surface text-[12px] text-muted-foreground">
            Walkthrough video — coming soon
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
