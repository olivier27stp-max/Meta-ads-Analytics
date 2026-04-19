import { NextResponse } from "next/server";
import { hasMetaCredentials } from "@/lib/meta-sync";

/**
 * Describes the account sync integration status. The UI uses the persisted
 * client-side store as the source of truth for account records so the app
 * stays fully functional without a database.
 */
export async function GET() {
  return NextResponse.json({
    integration: "meta",
    hasCredentials: hasMetaCredentials(),
    apiVersion: "v21.0",
    note:
      "Account records are managed in the client store. Use POST /api/accounts/:id/sync to run a sync.",
  });
}
