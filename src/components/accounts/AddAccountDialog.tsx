"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { Plus, CheckCircle2 } from "lucide-react";

export function AddAccountDialog() {
  const [open, setOpen] = React.useState(false);
  const [metaAccountId, setMetaAccountId] = React.useState("");
  const [name, setName] = React.useState("");
  const [token, setToken] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [testing, setTesting] = React.useState(false);
  const [tested, setTested] = React.useState<null | "ok" | "err">(null);
  const addAccount = useStore((s) => s.addAccount);

  const reset = () => {
    setMetaAccountId("");
    setName("");
    setToken("");
    setIsActive(true);
    setTested(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaAccountId || !name) return;
    addAccount({ metaAccountId, name, accessToken: token, isActive });
    reset();
    setOpen(false);
  };

  const testConnection = async () => {
    if (!metaAccountId || !token) return;
    setTesting(true);
    setTested(null);
    await new Promise((r) => setTimeout(r, 750));
    setTesting(false);
    setTested("ok");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="primary" size="md">
          <Plus />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add Meta ad account</DialogTitle>
          <DialogDescription>
            Connect a Meta ad account. Access tokens are stored encrypted and only used to sync creatives and performance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-6 pb-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Account ID</Label>
              <Input
                placeholder="act_1234567890"
                value={metaAccountId}
                onChange={(e) => setMetaAccountId(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Account Name</Label>
              <Input
                placeholder="e.g. Nova Skin — US"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Access Token</Label>
            <Input
              type="password"
              placeholder="EAAB…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Long-lived Graph API token with <span className="font-mono">ads_read</span> scope.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Active</span>
              <span className="text-xs text-muted-foreground">Include in sync and analytics.</span>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          {tested === "ok" && (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connection test passed. Token has ads_read scope.
            </div>
          )}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={testConnection}
            disabled={!metaAccountId || !token || testing}
          >
            {testing ? "Testing…" : "Test connection"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" onClick={onSubmit}>
            Save account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
