import { NextResponse, type NextRequest } from "next/server";

/**
 * Placeholder CJ webhook/callback endpoint (e.g. for shipment/tracking
 * updates), pending confirmation of CJ's actual callback mechanism and
 * payload signing (if any) in their current developer documentation.
 * Do not treat this as functioning until that's verified.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "CJ webhook handling not implemented yet." },
    { status: 501 }
  );
}
