/**
 * Queue System using Upstash Redis and QStash
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client
const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Upstash Redis not configured. Using in-memory simulation.");
    return null;
  }

  return new Redis({ url, token });
};

// In-memory simulation for development
const inMemoryStore: Map<string, string> = new Map();

interface ScanJob {
  scanId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  status: "pending" | "queued" | "running" | "enriching" | "completed" | "failed";
  progress: number;
  currentStage?: string;
  spiderfootScanIds: string[];
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/**
 * Store scan job data
 */
export async function setScanJob(scanId: string, job: ScanJob): Promise<void> {
  const redis = getRedis();
  const data = JSON.stringify(job);

  if (redis) {
    await redis.set(`scan:${scanId}`, data, { ex: 86400 }); // 24 hour TTL
  } else {
    inMemoryStore.set(`scan:${scanId}`, data);
  }
}

/**
 * Get scan job data
 */
export async function getScanJob(scanId: string): Promise<ScanJob | null> {
  const redis = getRedis();

  let data: string | null;
  if (redis) {
    data = await redis.get(`scan:${scanId}`);
  } else {
    data = inMemoryStore.get(`scan:${scanId}`) || null;
  }

  if (!data) return null;
  return JSON.parse(data) as ScanJob;
}

/**
 * Update scan job status
 */
export async function updateScanStatus(
  scanId: string,
  updates: Partial<ScanJob>
): Promise<void> {
  const job = await getScanJob(scanId);
  if (!job) return;

  const updatedJob = { ...job, ...updates };
  await setScanJob(scanId, updatedJob);
}

/**
 * Queue a new scan using QStash (or simulate for development)
 */
export async function queueScan(scanId: string): Promise<void> {
  const qstashToken = process.env.QSTASH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await updateScanStatus(scanId, { status: "queued" });

  if (!qstashToken) {
    console.warn("QStash not configured. Running scan synchronously.");
    // In development, we'll process the scan via periodic polling
    return;
  }

  const webhookUrl = `${appUrl}/api/webhooks/scan-process`;

  try {
    // QStash v2 publish endpoint - URL goes in the path
    const response = await fetch(
      `https://qstash.upstash.io/v2/publish/${encodeURIComponent(webhookUrl)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qstashToken}`,
          "Content-Type": "application/json",
          "Upstash-Retries": "3",
          "Upstash-Delay": "1s",
        },
        body: JSON.stringify({ scanId }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QStash error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[QStash] Scan ${scanId} queued with message ID: ${result.messageId}`);
  } catch (error) {
    console.error("Failed to queue scan:", error);
    throw error;
  }
}

/**
 * Verify QStash signature for webhook security
 */
export function verifyQStashSignature(
  signature: string,
  body: string
): boolean {
  const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signingKey) {
    console.warn("QStash signing key not configured. Skipping verification.");
    return true;
  }

  const crypto = require("crypto");

  const verify = (key: string): boolean => {
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(body);
    const expectedSignature = hmac.digest("base64");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  };

  if (verify(signingKey)) {
    return true;
  }

  if (nextSigningKey && verify(nextSigningKey)) {
    return true;
  }

  return false;
}
