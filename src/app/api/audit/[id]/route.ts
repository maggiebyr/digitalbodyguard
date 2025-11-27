import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getScanJob, updateScanStatus } from "@/lib/queue";
import { EnrichmentEngine } from "@/lib/spiderfoot";
import {
  categorizeFinding,
  calculateRiskScore,
  summarizeFindings,
} from "@/lib/findings";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get scan from database
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Verify user owns this scan
    if (scan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If scan is still pending/queued/running, try to process it
    if (["pending", "queued"].includes(scan.status)) {
      // Try to run the scan (for development without QStash)
      await processIfNeeded(id);
    }

    // Get current job status from queue
    const jobStatus = await getScanJob(id);

    // Map severity to sort order for proper sorting
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

    // Build response based on status
    if (scan.status === "completed" || jobStatus?.status === "completed") {
      // Sort findings by severity
      const sortedFindings = [...scan.findings].sort(
        (a, b) =>
          (severityOrder[a.severity] ?? 4) -
          (severityOrder[b.severity] ?? 4)
      );

      return NextResponse.json({
        id: scan.id,
        status: "completed",
        risk_score: scan.riskScore,
        summary: {
          total: scan.totalFindings,
          critical: scan.criticalFindings,
          high: scan.highFindings,
          medium: scan.mediumFindings,
          low: scan.lowFindings,
        },
        findings: sortedFindings.map((f) => ({
          id: f.id,
          category: f.category,
          severity: f.severity,
          source_name: f.sourceName,
          title: f.title,
          description: f.description,
          data_found: f.dataFound,
        })),
        completed_at: scan.completedAt?.toISOString(),
      });
    }

    // Return in-progress status
    return NextResponse.json({
      id: scan.id,
      status: jobStatus?.status || scan.status,
      progress: jobStatus?.progress || scan.progress,
      current_stage: jobStatus?.currentStage || scan.currentStage,
      findings_preview: scan.findings.length,
      started_at: scan.startedAt?.toISOString(),
    });
  } catch (error) {
    console.error("Get audit error:", error);
    return NextResponse.json(
      { error: "Failed to get audit status" },
      { status: 500 }
    );
  }
}

/**
 * Process scan if it's still pending (for development without QStash)
 */
async function processIfNeeded(scanId: string) {
  const job = await getScanJob(scanId);
  if (!job) {
    return;
  }

  // Only process if pending or queued
  if (job.status !== "pending" && job.status !== "queued") {
    return;
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
        });
        await prisma.scan.update({
          where: { id: scanId },
          data: { progress, currentStage: stage },
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
  }
}
