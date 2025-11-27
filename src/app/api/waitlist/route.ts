import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Valid email is required"),
  scan_id: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email, scan_id, source } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if already on waitlist
    const existing = await prisma.waitlist.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Get position in waitlist
      const position = await prisma.waitlist.count({
        where: {
          createdAt: { lte: existing.createdAt },
        },
      });

      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist!",
        position,
      });
    }

    // Add to waitlist
    const entry = await prisma.waitlist.create({
      data: {
        email: normalizedEmail,
        scanId: scan_id || null,
        source: source || "results_page",
      },
    });

    // Get position in waitlist
    const position = await prisma.waitlist.count({
      where: {
        createdAt: { lte: entry.createdAt },
      },
    });

    return NextResponse.json({
      success: true,
      message: "You've been added to the waitlist!",
      position,
    });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = await prisma.waitlist.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Waitlist count error:", error);
    return NextResponse.json(
      { error: "Failed to get waitlist count" },
      { status: 500 }
    );
  }
}
