"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface Finding {
  id: string;
  category: string;
  severity: string;
  source_name: string;
  title: string;
  description: string;
  data_found?: Record<string, unknown>;
}

interface FindingCardProps {
  finding: Finding;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badge: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  high: {
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    badge: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  medium: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  low: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badge: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
};

const categoryLabels: Record<string, string> = {
  breach: "Data Breach",
  social_media: "Social Media",
  location: "Location",
  phone: "Phone",
  dark_web: "Dark Web",
  professional: "Professional",
  other: "Other",
};

const actionRecommendations: Record<string, string[]> = {
  breach: [
    "Change this password immediately on all sites where you use it",
    "Enable two-factor authentication on affected accounts",
    "Check your accounts for unauthorized activity",
  ],
  dark_web: [
    "Monitor your accounts for suspicious activity",
    "Consider freezing your credit if sensitive data was exposed",
    "Set up identity theft protection services",
  ],
  location: [
    "Review privacy settings on sites that expose your address",
    "Request removal from data broker sites",
    "Consider using a P.O. Box for public-facing purposes",
  ],
  social_media: [
    "Review privacy settings on this platform",
    "Consider removing sensitive personal information",
    "Audit who can see your posts and profile",
  ],
  phone: [
    "Be cautious of unexpected calls or texts",
    "Consider using call blocking apps",
    "Don't share your phone number publicly",
  ],
  professional: [
    "Review what information is publicly visible",
    "Consider limiting professional profile details",
  ],
  other: ["Review and update your privacy settings"],
};

export function FindingCard({ finding }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = severityConfig[finding.severity as keyof typeof severityConfig] || severityConfig.low;
  const Icon = config.icon;
  const recommendations = actionRecommendations[finding.category] || actionRecommendations.other;

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className={`h-6 w-6 ${config.color} mt-0.5 shrink-0`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={config.badge}>
                  {finding.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {categoryLabels[finding.category] || finding.category}
                </Badge>
              </div>
              <h3 className="font-semibold mt-2">{finding.title}</h3>
              <p className="text-sm text-muted-foreground">
                Source: {finding.source_name}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">{finding.description}</p>

        {/* Expandable section */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between"
        >
          <span>What should I do?</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {isExpanded && (
          <div className="mt-3 p-4 bg-white/50 rounded-lg">
            <p className="font-medium text-sm mb-2">Recommended Actions:</p>
            <ul className="text-sm space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
