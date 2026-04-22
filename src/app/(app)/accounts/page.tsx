import { PageHeader } from "@/components/layout/PageHeader";
import { ControlBar } from "@/components/layout/ControlBar";
import { GlobalKpiStrip } from "@/components/kpi/GlobalKpiStrip";
import { AccountsTable } from "@/components/accounts/AccountsTable";
import { AddAccountDialog } from "@/components/accounts/AddAccountDialog";
import { SyncResultBanner } from "@/components/accounts/SyncResultBanner";

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accounts"
        description="Connect, sync, and manage Meta ad accounts feeding this workspace."
        actions={<AddAccountDialog />}
      />
      <ControlBar />
      <GlobalKpiStrip />
      <SyncResultBanner />
      <AccountsTable />
    </div>
  );
}
