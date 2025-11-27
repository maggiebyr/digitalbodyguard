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
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = startAuditSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, persona_inquiry_id } = parsed.data;

    // Verify Persona inquiry
    const verification = await verifyPersonaInquiry(
      persona_inquiry_id,
      name,
      email
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: verification.error || "Identity verification failed" },
        { status: 403 }
      );
    }

    // Update user with Persona verification
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        personaInquiryId: persona_inquiry_id,
        personaVerifiedAt: new Date(),
      },
    });

    // Create scan record in database
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

    // Queue the scan for processing
    await queueScan(scan.id);

    return NextResponse.json({
      scan_id: scan.id,
      status: "queued",
      estimated_duration_minutes: 5,
    });
  } catch (error) {
    console.error("Start audit error:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}
