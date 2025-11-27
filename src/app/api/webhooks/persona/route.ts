import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

/**
 * Persona Webhook Handler
 * Receives verification completion events from Persona
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature in production
    const signature = request.headers.get("persona-signature");
    const webhookSecret = process.env.PERSONA_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const isValid = verifyPersonaSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error("[Persona Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production" && !webhookSecret) {
      console.warn("[Persona Webhook] Warning: PERSONA_WEBHOOK_SECRET not configured");
    }

    const event = JSON.parse(body);
    const eventType = event.data?.attributes?.name;

    console.log(`[Persona Webhook] Received event: ${eventType}`);

    // Handle inquiry completed events
    if (eventType === "inquiry.completed" || eventType === "inquiry.approved") {
      const inquiryId = event.data?.attributes?.payload?.data?.id;
      const status = event.data?.attributes?.payload?.data?.attributes?.status;
      const referenceId = event.data?.attributes?.payload?.data?.attributes?.["reference-id"];

      if (inquiryId && (status === "completed" || status === "approved")) {
        // Find user by inquiry ID or reference ID (which could be user ID)
        let user = await prisma.user.findFirst({
          where: { personaInquiryId: inquiryId },
        });

        if (!user && referenceId) {
          user = await prisma.user.findUnique({
            where: { id: referenceId },
          });
        }

        if (user) {
          // Update user verification status
          await prisma.user.update({
            where: { id: user.id },
            data: {
              personaInquiryId: inquiryId,
              personaVerifiedAt: new Date(),
            },
          });
          console.log(`[Persona Webhook] User ${user.id} verified via inquiry ${inquiryId}`);
        } else {
          console.warn(`[Persona Webhook] No user found for inquiry ${inquiryId}`);
        }
      }
    }

    // Handle verification declined
    if (eventType === "inquiry.declined" || eventType === "inquiry.failed") {
      const inquiryId = event.data?.attributes?.payload?.data?.id;
      console.warn(`[Persona Webhook] Inquiry ${inquiryId} was declined/failed`);
      // Could notify user or take other action here
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Persona Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify Persona webhook signature
 */
function verifyPersonaSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Persona uses HMAC-SHA256
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const expectedSignature = hmac.digest("hex");

    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
