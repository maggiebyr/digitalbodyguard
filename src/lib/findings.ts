/**
 * Finding Categorization and Risk Score Calculation
 */

import type { SpiderFootEvent } from "./spiderfoot";

export type FindingCategory =
  | "breach"
  | "social_media"
  | "location"
  | "phone"
  | "dark_web"
  | "professional"
  | "other";

export type FindingSeverity = "critical" | "high" | "medium" | "low";

export interface Finding {
  id?: string;
  category: FindingCategory;
  severity: FindingSeverity;
  sourceModule: string;
  sourceName: string;
  title: string;
  description: string;
  dataFound: Record<string, unknown>;
  fingerprint: string;
  enrichmentPass: number;
}

// Event type to category/severity mapping
const EVENT_MAPPING: Record<
  string,
  { category: FindingCategory; severity: FindingSeverity }
> = {
  // CRITICAL - Immediate security risk
  EMAILADDR_COMPROMISED: { category: "breach", severity: "critical" },
  PASSWORD_COMPROMISED: { category: "breach", severity: "critical" },
  DARKNET_MENTION_CONTENT: { category: "dark_web", severity: "critical" },
  PHYSICAL_ADDRESS: { category: "location", severity: "critical" },

  // HIGH - Significant exposure
  SOCIAL_MEDIA: { category: "social_media", severity: "high" },
  ACCOUNT_EXTERNAL_OWNED: { category: "social_media", severity: "high" },
  GEOINFO: { category: "location", severity: "high" },
  PHONE_NUMBER_LEAKED: { category: "phone", severity: "high" },

  // MEDIUM - Notable findings
  EMAILADDR: { category: "other", severity: "medium" },
  PHONE_NUMBER: { category: "phone", severity: "medium" },
  USERNAME: { category: "social_media", severity: "medium" },
  COMPANY_NAME: { category: "professional", severity: "medium" },

  // LOW - Informational
  HUMAN_NAME: { category: "other", severity: "low" },
  DOMAIN_NAME: { category: "other", severity: "low" },
  WEBSERVER_HTTPHEADERS: { category: "other", severity: "low" },
};

// Human-readable module names
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  sfp_haveibeenpwned: "HaveIBeenPwned",
  sfp_dehashed: "Dehashed",
  sfp_leakix: "LeakIX",
  sfp_psbdmp: "Pastebin",
  sfp_intelx: "IntelligenceX",
  sfp_accounts: "Account Search",
  sfp_socialprofiles: "Social Profiles",
  sfp_gravatar: "Gravatar",
  sfp_github: "GitHub",
  sfp_instagram: "Instagram",
  sfp_flickr: "Flickr",
  sfp_linkedin: "LinkedIn",
  sfp_twitter: "Twitter",
  sfp_fullcontact: "FullContact",
  sfp_clearbit: "Clearbit",
  sfp_numverify: "NumVerify",
  sfp_twilio: "Twilio",
  sfp_ahmia: "Dark Web Search",
  sfp_archive_org: "Wayback Machine",
  sfp_geoip: "IP Geolocation",
  sfp_openstreetmap: "OpenStreetMap",
};

/**
 * Generate a human-readable title for a finding
 */
function generateTitle(event: SpiderFootEvent): string {
  const templates: Record<string, (data: string) => string> = {
    EMAILADDR_COMPROMISED: () => "Email found in data breach",
    PASSWORD_COMPROMISED: () => "Password exposed in data breach",
    DARKNET_MENTION_CONTENT: () => "Information found on dark web",
    PHYSICAL_ADDRESS: () => "Physical address publicly visible",
    SOCIAL_MEDIA: (data) => {
      const platform = extractPlatform(data);
      return `${platform} profile found`;
    },
    ACCOUNT_EXTERNAL_OWNED: (data) => {
      const platform = extractPlatform(data);
      return `Account discovered on ${platform}`;
    },
    GEOINFO: () => "Location information exposed",
    PHONE_NUMBER: () => "Phone number found in public records",
    PHONE_NUMBER_LEAKED: () => "Phone number exposed in data leak",
    USERNAME: (data) => `Username "${data}" found across sites`,
    COMPANY_NAME: () => "Professional affiliation discovered",
    EMAILADDR: () => "Email address publicly visible",
  };

  const template = templates[event.type];
  if (template) {
    return template(event.data);
  }

  return `${event.type.replace(/_/g, " ").toLowerCase()} found`;
}

/**
 * Generate a detailed description for a finding
 */
function generateDescription(event: SpiderFootEvent): string {
  const descriptions: Record<string, (data: string, source?: string) => string> = {
    EMAILADDR_COMPROMISED: (data) =>
      `Your email was found in a data breach: ${data}. If you reused this password elsewhere, those accounts may be at risk.`,
    PASSWORD_COMPROMISED: () =>
      "A password associated with your account was exposed. Change this password immediately on all sites where you use it.",
    DARKNET_MENTION_CONTENT: (data) =>
      `Your information was found in a dark web source: ${data}. This could indicate your data is being traded or discussed in underground forums.`,
    PHYSICAL_ADDRESS: (data) =>
      `Your physical address "${data}" is publicly accessible. This information could be used by anyone to locate you.`,
    SOCIAL_MEDIA: (data) =>
      `Public social media profile found at: ${data}. Review this profile's privacy settings.`,
    ACCOUNT_EXTERNAL_OWNED: (data) =>
      `An account linked to your identity was found: ${data}. Verify this is your account and review its security settings.`,
    GEOINFO: (data) =>
      `Geographic information was discovered: ${data}. This may have been derived from IP addresses, photos, or other sources.`,
    PHONE_NUMBER: (data) =>
      `Your phone number ${data} was found in public records. This could be used for spam calls or social engineering.`,
    USERNAME: (data) =>
      `The username "${data}" appears to be linked to your identity across multiple platforms.`,
  };

  const descFn = descriptions[event.type];
  if (descFn) {
    return descFn(event.data, event.source);
  }

  return `Found: ${event.data}${event.source ? ` (Source: ${event.source})` : ""}`;
}

/**
 * Extract platform name from URL or data string
 */
function extractPlatform(data: string): string {
  const platformPatterns: [RegExp, string][] = [
    [/linkedin/i, "LinkedIn"],
    [/github/i, "GitHub"],
    [/twitter|x\.com/i, "Twitter/X"],
    [/instagram/i, "Instagram"],
    [/facebook/i, "Facebook"],
    [/tiktok/i, "TikTok"],
    [/reddit/i, "Reddit"],
    [/youtube/i, "YouTube"],
    [/pinterest/i, "Pinterest"],
    [/snapchat/i, "Snapchat"],
    [/flickr/i, "Flickr"],
    [/myspace/i, "MySpace"],
    [/venmo/i, "Venmo"],
  ];

  for (const [pattern, name] of platformPatterns) {
    if (pattern.test(data)) {
      return name;
    }
  }

  return "Social Platform";
}

/**
 * Create a fingerprint for deduplication
 */
function createFingerprint(event: SpiderFootEvent): string {
  const crypto = require("crypto");
  const keyData = `${event.type}:${event.data}:${event.module}`;
  return crypto.createHash("md5").update(keyData).digest("hex");
}

/**
 * Convert SpiderFoot event to Finding
 */
export function categorizeFinding(
  event: SpiderFootEvent,
  enrichmentPass: number = 1
): Finding {
  const mapping = EVENT_MAPPING[event.type] || {
    category: "other" as FindingCategory,
    severity: "low" as FindingSeverity,
  };

  return {
    category: mapping.category,
    severity: mapping.severity,
    sourceModule: event.module,
    sourceName:
      MODULE_DISPLAY_NAMES[event.module] || event.source || event.module,
    title: generateTitle(event),
    description: generateDescription(event),
    dataFound: {
      type: event.type,
      data: event.data,
      source: event.source,
      confidence: event.confidence,
    },
    fingerprint: createFingerprint(event),
    enrichmentPass,
  };
}

/**
 * Calculate risk score based on findings
 */
export function calculateRiskScore(findings: Finding[]): number {
  const severityWeights = {
    critical: 25,
    high: 10,
    medium: 3,
    low: 1,
  };

  const categoryMultipliers: Record<FindingCategory, number> = {
    breach: 1.5, // Credentials exposed - very bad
    dark_web: 1.4, // Dark web mentions - scary
    location: 1.3, // Physical location - dangerous
    phone: 1.1, // Phone exposure
    social_media: 1.0, // Social profiles
    professional: 0.7, // LinkedIn etc - expected
    other: 0.5,
  };

  let rawScore = 0;

  for (const finding of findings) {
    const weight = severityWeights[finding.severity] || 1;
    const multiplier = categoryMultipliers[finding.category] || 1;
    rawScore += weight * multiplier;
  }

  // Normalize to 0-100
  // Cap at 200 raw points = 100 score
  const normalized = Math.min(100, Math.round((rawScore / 200) * 100));

  return normalized;
}

/**
 * Get risk level label based on score
 */
export function getRiskLevel(
  score: number
): "low" | "medium" | "high" | "critical" {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

/**
 * Summarize findings by severity
 */
export function summarizeFindings(findings: Finding[]): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<FindingCategory, number>;
} {
  const summary = {
    total: findings.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byCategory: {
      breach: 0,
      social_media: 0,
      location: 0,
      phone: 0,
      dark_web: 0,
      professional: 0,
      other: 0,
    } as Record<FindingCategory, number>,
  };

  for (const finding of findings) {
    summary[finding.severity]++;
    summary.byCategory[finding.category]++;
  }

  return summary;
}
