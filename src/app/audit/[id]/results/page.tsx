"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Loader2, AlertTriangle, MapPin, User, Phone, Eye, Briefcase } from "lucide-react";
import { RiskScoreGauge } from "@/components/RiskScoreGauge";
import { FindingCard } from "@/components/FindingCard";
import { WaitlistForm } from "@/components/WaitlistForm";

interface Finding {
  id: string;
  category: string;
  severity: string;
  source_name: string;
  title: string;
  description: string;
  data_found?: Record<string, unknown>;
}

interface ScanResults {
  id: string;
  status: string;
  risk_score: number;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: Finding[];
  completed_at: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  breach: AlertTriangle,
  social_media: User,
  location: MapPin,
  phone: Phone,
  dark_web: Eye,
  professional: Briefcase,
};

const categoryLabels: Record<string, string> = {
  breach: "Data Breaches",
  social_media: "Social Media",
  location: "Location",
  phone: "Phone",
  dark_web: "Dark Web",
  professional: "Professional",
  other: "Other",
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [results, setResults] = useState<ScanResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/audit/${scanId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to fetch results");
          return;
        }

        if (data.status !== "completed") {
          // Redirect back to status page if not completed
          router.push(`/audit/${scanId}`);
          return;
        }

        setResults(data);
      } catch {
        setError("Failed to fetch results");
      }
    }

    fetchResults();
  }, [scanId, router]);

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
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Group findings by category
  const findingsByCategory = results.findings.reduce<Record<string, Finding[]>>(
    (acc, finding) => {
      const category = finding.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(finding);
      return acc;
    },
    {}
  );

  const categories = Object.keys(findingsByCategory);

  const filteredFindings =
    activeCategory === "all"
      ? results.findings
      : findingsByCategory[activeCategory] || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Digital Bodyguard</span>
          </Link>
        </div>

        {/* Risk Score Section */}
        <Card className="mb-8">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
              {/* Risk Score Gauge */}
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">
                  Your Stalker Risk Score
                </h2>
                <RiskScoreGauge score={results.risk_score} size="lg" />
                <p className="text-muted-foreground mt-4 max-w-sm mx-auto">
                  We found {results.summary.total} ways someone could track or
                  target you.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {results.summary.critical}
                    </div>
                    <div className="text-sm text-red-700">Critical</div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {results.summary.high}
                    </div>
                    <div className="text-sm text-orange-700">High</div>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {results.summary.medium}
                    </div>
                    <div className="text-sm text-yellow-700">Medium</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {results.summary.low}
                    </div>
                    <div className="text-sm text-blue-700">Low</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Findings Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detailed Findings</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  All ({results.summary.total})
                </TabsTrigger>
                {categories.map((category) => {
                  const Icon = categoryIcons[category] || User;
                  const count = findingsByCategory[category]?.length || 0;
                  return (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {categoryLabels[category] || category} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={activeCategory} className="mt-6">
                <div className="space-y-4">
                  {filteredFindings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No findings in this category.
                    </p>
                  ) : (
                    filteredFindings.map((finding) => (
                      <FindingCard key={finding.id} finding={finding} />
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Waitlist CTA */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-8 pb-8">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4">
                Want This Data Removed?
              </h2>
              <p className="mb-6 opacity-90">
                We&apos;re building a service to automatically remove your
                information from data brokers and people-search sites. Be the
                first to know when it launches.
              </p>
              <div className="bg-white/10 backdrop-blur rounded-lg p-6">
                <WaitlistForm scanId={scanId} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Separator className="my-8" />
        <footer className="text-center text-sm text-muted-foreground pb-8">
          <p>
            Scan completed on{" "}
            {new Date(results.completed_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-2">
            Your data is encrypted and only accessible to you.
          </p>
        </footer>
      </div>
    </div>
  );
}
