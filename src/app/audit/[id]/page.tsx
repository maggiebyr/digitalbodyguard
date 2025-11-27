"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, Circle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanStatus {
  id: string;
  status: string;
  progress: number;
  current_stage?: string;
  findings_preview?: number;
  started_at?: string;
  error_message?: string;
}

const SCAN_STAGES = [
  { key: "breaches", label: "Checking data breaches" },
  { key: "social", label: "Scanning social networks" },
  { key: "records", label: "Searching public records" },
  { key: "darkweb", label: "Analyzing dark web" },
  { key: "enrichment", label: "Running enrichment pass" },
  { key: "report", label: "Generating report" },
];

function getStageIndex(progress: number): number {
  if (progress >= 100) return SCAN_STAGES.length;
  if (progress >= 90) return 5;
  if (progress >= 70) return 4;
  if (progress >= 50) return 3;
  if (progress >= 30) return 2;
  if (progress >= 10) return 1;
  return 0;
}

export default function ScanStatusPage() {
  const router = useRouter();
  const params = useParams();
  const scanId = params.id as string;

  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${scanId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch scan status");
        return;
      }

      setStatus(data);

      // If completed, redirect to results
      if (data.status === "completed") {
        router.push(`/audit/${scanId}/results`);
      }
    } catch {
      setError("Failed to fetch scan status");
    }
  }, [scanId, router]);

  useEffect(() => {
    fetchStatus();

    // Poll every 5 seconds while scan is in progress
    const interval = setInterval(() => {
      if (status?.status !== "completed" && status?.status !== "failed") {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStatus, status?.status]);

  const currentStageIndex = status ? getStageIndex(status.progress) : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Digital Bodyguard</span>
          </Link>

          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push("/audit/new")}>
                Start New Audit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status?.status === "failed") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Digital Bodyguard</span>
          </Link>

          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Scan Failed</h2>
              <p className="text-muted-foreground mb-4">
                {status.error_message ||
                  "An error occurred during the scan. Please try again."}
              </p>
              <Button onClick={() => router.push("/audit/new")}>
                Start New Audit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">Digital Bodyguard</span>
        </Link>

        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Scanning Your Digital Footprint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Circle */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-slate-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-primary"
                    strokeDasharray={`${(status?.progress || 0) * 3.52} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {status?.progress || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Current Stage */}
            <p className="text-center text-muted-foreground">
              {status?.current_stage || "Initializing scan..."}
            </p>

            {/* Progress Bar */}
            <Progress value={status?.progress || 0} className="h-2" />

            {/* Stage List */}
            <div className="space-y-3">
              <p className="font-medium text-sm">Progress:</p>
              {SCAN_STAGES.map((stage, index) => (
                <div key={stage.key} className="flex items-center gap-3">
                  {index < currentStageIndex ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : index === currentStageIndex ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                  <span
                    className={
                      index <= currentStageIndex
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {stage.label}
                    {index === currentStageIndex && (
                      <span className="text-muted-foreground ml-2">
                        (in progress)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Findings Preview */}
            {status?.findings_preview !== undefined && status.findings_preview > 0 && (
              <div className="bg-slate-50 p-4 rounded-lg text-center">
                <p className="text-lg font-semibold">
                  Found {status.findings_preview} exposures so far...
                </p>
              </div>
            )}

            {/* Info */}
            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              <p>
                This takes 5-10 minutes. We&apos;ll email you when it&apos;s ready.
              </p>
              <p className="mt-1">You can close this page and come back.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
