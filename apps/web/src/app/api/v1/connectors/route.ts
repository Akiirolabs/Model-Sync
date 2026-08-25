import { listConnectors } from "@model-sync/connectors";
import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api/guard";

/** Connector catalog for the Connect page / SDK discovery. */
export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  return NextResponse.json(listConnectors());
}
