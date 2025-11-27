import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScanJob, updateScanStatus, verifyQStashSignature } from "@/lib/queue";
import { EnrichmentEngine } from "@/lib/spiderfoot";
import {
  categorizeFinding,
  calculateRiskScore,
  summarizeFindings,
} from "@/lib/findings";

export async function POST(request: NextRequest) {
  try {
    // Verify QStash signature for production
    const signature = request.headers.get("upstash-signature") || "";
    const body = await request.text();

    if (!verifyQStashSignature(signature, body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(body);
    const { scanId } = data;

    if (!scanId) {
      return NextResponse.json(
        { error: "Missing scanId" },
        { status: 400 }
      );
    }

    // Get job data
    const job = await getScanJob(scanId);
    if (!job) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Start processing
    await updateScanStatus(scanId, {
      status: "running",
      startedAt: new Date().toISOString(),
    });

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    // Run the enrichment engine
    const engine = new EnrichmentEngine(3);

    try {
      const { scanIds, events } = await engine.runEnrichedScan(
        job.name,
        job.email,
        job.phone,
        async (progress, stage) => {
          await updateScanStatus(scanId, {
            progress,
            currentStage: stage,
            status: progress >= 90 ? "enriching" : "running",
          });
          await prisma.scan.update({
            where: { id: scanId },
            data: {
              progress,
              currentStage: stage,
              status: progress >= 90 ? "enriching" : "running",
            },
          });
        }
      );

      // Convert events to findings
      const findings = events.map((e) =>
        categorizeFinding(e, (e as { enrichmentPass?: number }).enrichmentPass || 1)
      );

      // Calculate risk score
      const riskScore = calculateRiskScore(findings);
      const summary = summarizeFindings(findings);

      // Save findings to database
      for (const finding of findings) {
        await prisma.finding.upsert({
          where: {
            scanId_fingerprint: {
              scanId,
              fingerprint: finding.fingerprint,
            },
          },
          create: {
            scanId,
            category: finding.category,
            severity: finding.severity,
            sourceModule: finding.sourceModule,
            sourceName: finding.sourceName,
            title: finding.title,
            description: finding.description,
            dataFound: finding.dataFound as object,
            fingerprint: finding.fingerprint,
            enrichmentPass: finding.enrichmentPass,
          },
          update: {},
        });
      }

      // Update scan as completed
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: "completed",
          progress: 100,
          spiderfootScanIds: scanIds,
          riskScore,
          totalFindings: summary.total,
          criticalFindings: summary.critical,
          highFindings: summary.high,
          mediumFindings: summary.medium,
          lowFindings: summary.low,
          completedAt: new Date(),
        },
      });

      await updateScanStatus(scanId, {
        status: "completed",
        progress: 100,
        spiderfootScanIds: scanIds,
        completedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, scanId });
    } catch (error) {
      console.error("Scan processing error:", error);

      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });

      await updateScanStatus(scanId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return NextResponse.json(
        { error: "Scan processing failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
