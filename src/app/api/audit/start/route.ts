import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPersonaInquiry } from "@/lib/persona";
import { queueScan, setScanJob } from "@/lib/queue";
import { z } from "zod";

const startAuditSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  persona_inquiry_id: z.string().min(1, "Persona verification is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    console.log("[Audit] Session:", session?.user?.id ? "authenticated" : "none");

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log("[Audit] Request body:", JSON.stringify(body));

    const parsed = startAuditSchema.safeParse(body);

    if (!parsed.success) {
      console.log("[Audit] Validation error:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, persona_inquiry_id } = parsed.data;

    // Verify Persona inquiry
    console.log("[Audit] Verifying Persona inquiry:", persona_inquiry_id);
    const verification = await verifyPersonaInquiry(
      persona_inquiry_id,
      name,
      email
    );

    if (!verification.verified) {
      console.log("[Audit] Persona verification failed:", verification.error);
      return NextResponse.json(
        { error: verification.error || "Identity verification failed" },
        { status: 403 }
      );
    }
    console.log("[Audit] Persona verification passed");

    // Update user with Persona verification
    console.log("[Audit] Updating user:", session.user.id);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        personaInquiryId: persona_inquiry_id,
        personaVerifiedAt: new Date(),
      },
    });

    // Create scan record in database
    console.log("[Audit] Creating scan record");
    const scan = await prisma.scan.create({
      data: {
        userId: session.user.id,
        inputName: name,
        inputEmail: email.toLowerCase(),
        inputPhone: phone || null,
        status: "pending",
        progress: 0,
      },
    });
    console.log("[Audit] Scan created:", scan.id);

    // Initialize scan job in queue
    await setScanJob(scan.id, {
      scanId: scan.id,
      userId: session.user.id,
      name,
      email: email.toLowerCase(),
      phone,
      status: "pending",
      progress: 0,
      spiderfootScanIds: [],
    });

    // Queue the scan for processing (non-fatal if it fails)
    try {
      await queueScan(scan.id);
      console.log("[Audit] Scan queued successfully");
    } catch (queueError) {
      console.error("[Audit] Queue error (non-fatal):", queueError);
      // Continue anyway - scan will be processed via polling
    }

    return NextResponse.json({
      scan_id: scan.id,
      status: "queued",
      estimated_duration_minutes: 5,
    });
  } catch (error) {
    console.error("[Audit] Start audit error:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}
