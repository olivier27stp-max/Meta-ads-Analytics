"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ContactRound,
  PhoneCall,
  CalendarDays,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadsAutomationTab } from "@/components/automation/LeadsAutomationTab";
import { TwilioAutomationTab } from "@/components/automation/TwilioAutomationTab";
import { GoogleCalendarTab } from "@/components/automation/GoogleCalendarTab";
import { PipelineAutomationTab } from "@/components/automation/PipelineAutomationTab";
import { AdAnalystTab } from "@/components/automation/AdAnalystTab";

const TABS = [
  { id: "leads",     label: "Leads",              icon: ContactRound },
  { id: "twilio",    label: "Enregistrement d'appels", icon: PhoneCall },
  { id: "calendar",  label: "Calendrier",         icon: CalendarDays },
  { id: "pipeline",  label: "Automatisation pipeline", icon: GitBranch },
  { id: "ads",       label: "Ad analyst",         icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AutomationPage() {
  return (
    <React.Suspense fallback={null}>
      <AutomationPageInner />
    </React.Suspense>
  );
}

function AutomationPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const urlTab = search.get("tab");
  const initial: TabId =
    urlTab && TABS.some((t) => t.id === urlTab) ? (urlTab as TabId) : "leads";
  const [tab, setTab] = React.useState<TabId>(initial);

  React.useEffect(() => {
    if (urlTab && urlTab !== tab && TABS.some((t) => t.id === urlTab)) {
      setTab(urlTab as TabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const onChange = (next: string) => {
    setTab(next as TabId);
    const params = new URLSearchParams(search.toString());
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Automation"
        description="Orchestration layer that connects landing pages, calls, calendar, pipeline, and ads to Entiore."
      />

      <Tabs value={tab} onValueChange={onChange} className="w-full">
        <TabsList className="w-full max-w-full overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-1.5">
              <Icon className="h-3 w-3" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="leads">
          <LeadsAutomationTab />
        </TabsContent>
        <TabsContent value="twilio">
          <TwilioAutomationTab />
        </TabsContent>
        <TabsContent value="calendar">
          <GoogleCalendarTab />
        </TabsContent>
        <TabsContent value="pipeline">
          <PipelineAutomationTab />
        </TabsContent>
        <TabsContent value="ads">
          <AdAnalystTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
