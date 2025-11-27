/**
 * SpiderFoot OSINT Engine Client
 * Production-ready integration with SpiderFoot HX REST API
 */

import crypto from "crypto";

// Consumer audit modules organized by purpose
export const CONSUMER_AUDIT_MODULES = {
  // Tier 1: Account & Identity Discovery
  account_discovery: [
    "sfp_accounts",
    "sfp_socialprofiles",
    "sfp_gravatar",
    "sfp_skymem",
    "sfp_emailrep",
    "sfp_hunter",
  ],
  // Tier 2: Data Breach Exposure
  breach_data: [
    "sfp_haveibeenpwned",
    "sfp_dehashed",
    "sfp_leakix",
    "sfp_psbdmp",
    "sfp_leaklookup",
    "sfp_intelx",
  ],
  // Tier 3: Social Media Profiles
  social_media: [
    "sfp_instagram",
    "sfp_flickr",
    "sfp_myspace",
    "sfp_slideshare",
    "sfp_stackoverflow",
    "sfp_github",
    "sfp_keybase",
    "sfp_venmo",
  ],
  // Tier 4: Phone Number Intelligence
  phone_intel: [
    "sfp_numverify",
    "sfp_twilio",
    "sfp_callername",
    "sfp_textmagic",
  ],
  // Tier 5: Location & Physical Data
  location: ["sfp_geoip", "sfp_openstreetmap"],
  // Tier 6: Data Enrichment Services
  enrichment: ["sfp_fullcontact", "sfp_clearbit", "sfp_seon"],
  // Tier 7: Dark Web
  dark_web: ["sfp_ahmia"],
  // Tier 8: Historical Data
  historical: ["sfp_archive_org", "sfp_commoncrawl"],
};

export const ALL_MODULES = Object.values(CONSUMER_AUDIT_MODULES).flat();

export interface SpiderFootEvent {
  type: string;
  module: string;
  data: string;
  source?: string;
  confidence?: number;
  enrichmentPass?: number;
}

export interface ScanTarget {
  value: string;
  type: "EMAILADDR" | "HUMAN_NAME" | "PHONE_NUMBER" | "USERNAME";
}

export interface ScanResult {
  scanId: string;
  status: "running" | "completed" | "failed";
  events: SpiderFootEvent[];
  progress?: number;
}

interface SpiderFootAPIResponse {
  success?: boolean;
  data?: unknown;
  error?: string;
}

class SpiderFootClient {
  private baseUrl: string;
  private apiKey?: string;
  private isConfigured: boolean;

  constructor() {
    this.baseUrl = process.env.SPIDERFOOT_API_URL || "";
    this.apiKey = process.env.SPIDERFOOT_API_KEY;
    this.isConfigured = !!this.baseUrl;
  }

  /**
   * Check if SpiderFoot is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  private async request<T = SpiderFootAPIResponse>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new Error("SpiderFoot is not configured. Set SPIDERFOOT_API_URL.");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `SpiderFoot API error: ${response.status} - ${errorText}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`SpiderFoot request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Start a new scan with SpiderFoot
   */
  async startScan(
    name: string,
    targets: ScanTarget[],
    modules: string[] = ALL_MODULES
  ): Promise<string> {
    // Use demo mode if not configured
    if (!this.isConfigured) {
      console.warn("[SpiderFoot] Not configured - using demo mode");
      return `demo_scan_${Date.now()}`;
    }

    const targetString = targets.map((t) => t.value).join(",");

    // SpiderFoot REST API format
    const formData = new URLSearchParams();
    formData.append("scanname", name);
    formData.append("scantarget", targetString);
    formData.append("modulelist", modules.join(","));
    formData.append("typelist", "");
    formData.append("usecase", "all");

    const response = await fetch(`${this.baseUrl}/startscan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to start scan: ${response.status}`);
    }

    const data = await response.json();

    // SpiderFoot returns scan ID in different formats depending on version
    const scanId = data.scanId || data.id || data.scan_id;

    if (!scanId) {
      throw new Error("No scan ID returned from SpiderFoot");
    }

    return scanId;
  }

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<ScanResult> {
    // Demo mode
    if (scanId.startsWith("demo_")) {
      return this.getDemoResults(scanId);
    }

    const statusResponse = await fetch(
      `${this.baseUrl}/scanstatus?id=${scanId}`,
      {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`Failed to get scan status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    // Get scan results/events
    const eventsResponse = await fetch(
      `${this.baseUrl}/scaneventresults?id=${scanId}`,
      {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      }
    );

    let events: SpiderFootEvent[] = [];
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      events = this.parseSpiderFootEvents(eventsData);
    }

    // Calculate progress based on status
    const statusMap: Record<string, "running" | "completed" | "failed"> = {
      RUNNING: "running",
      STARTED: "running",
      STARTING: "running",
      FINISHED: "completed",
      COMPLETED: "completed",
      ABORTED: "failed",
      FAILED: "failed",
      ERROR: "failed",
    };

    const status = statusMap[statusData.status] || "running";
    const progress =
      status === "completed" ? 100 : statusData.progress || 50;

    return {
      scanId,
      status,
      events,
      progress,
    };
  }

  /**
   * Parse SpiderFoot event results into our format
   */
  private parseSpiderFootEvents(data: unknown): SpiderFootEvent[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: Record<string, unknown>) => ({
      type: String(item.type || item.event_type || "UNKNOWN"),
      module: String(item.module || item.source_module || "unknown"),
      data: String(item.data || item.event_data || ""),
      source: String(item.source || item.source_entity || ""),
      confidence: Number(item.confidence || item.certainty || 100),
    }));
  }

  /**
   * Stop a running scan
   */
  async stopScan(scanId: string): Promise<void> {
    if (scanId.startsWith("demo_")) return;
    if (!this.isConfigured) return;

    await fetch(`${this.baseUrl}/stopscan?id=${scanId}`, {
      method: "GET",
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
    });
  }

  /**
   * Delete a scan and its data
   */
  async deleteScan(scanId: string): Promise<void> {
    if (scanId.startsWith("demo_")) return;
    if (!this.isConfigured) return;

    await fetch(`${this.baseUrl}/scandelete?id=${scanId}`, {
      method: "GET",
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
    });
  }

  /**
   * Generate demo results for development/testing
   * Returns completed results immediately for demo mode
   */
  private getDemoResults(scanId: string): ScanResult {
    // In demo mode, return completed results immediately
    const demoEvents: SpiderFootEvent[] = [
      {
        type: "EMAILADDR_COMPROMISED",
        module: "sfp_haveibeenpwned",
        data: "Found in LinkedIn data breach (2021)",
        source: "HaveIBeenPwned",
        confidence: 100,
      },
      {
        type: "EMAILADDR_COMPROMISED",
        module: "sfp_haveibeenpwned",
        data: "Found in Adobe data breach (2013)",
        source: "HaveIBeenPwned",
        confidence: 100,
      },
      {
        type: "EMAILADDR_COMPROMISED",
        module: "sfp_dehashed",
        data: "Found in Dropbox data breach (2012)",
        source: "DeHashed",
        confidence: 95,
      },
      {
        type: "SOCIAL_MEDIA",
        module: "sfp_socialprofiles",
        data: "https://linkedin.com/in/example",
        source: "LinkedIn",
        confidence: 90,
      },
      {
        type: "SOCIAL_MEDIA",
        module: "sfp_github",
        data: "https://github.com/example",
        source: "GitHub",
        confidence: 85,
      },
      {
        type: "ACCOUNT_EXTERNAL_OWNED",
        module: "sfp_accounts",
        data: "Twitter account found: @example",
        source: "Twitter",
        confidence: 75,
      },
      {
        type: "PHYSICAL_ADDRESS",
        module: "sfp_fullcontact",
        data: "123 Main Street, San Francisco, CA 94102",
        source: "Data Broker",
        confidence: 80,
      },
      {
        type: "PHONE_NUMBER",
        module: "sfp_numverify",
        data: "+1 (555) 123-4567",
        source: "Public Records",
        confidence: 70,
      },
      {
        type: "GEOINFO",
        module: "sfp_geoip",
        data: "Last known location: San Francisco Bay Area",
        source: "IP Geolocation",
        confidence: 60,
      },
      {
        type: "DARKNET_MENTION_CONTENT",
        module: "sfp_ahmia",
        data: "Email mentioned in dark web forum post",
        source: "Dark Web",
        confidence: 40,
      },
      {
        type: "USERNAME",
        module: "sfp_accounts",
        data: "username123",
        source: "Multiple Sites",
        confidence: 65,
      },
      {
        type: "PROFESSIONAL_INFO",
        module: "sfp_clearbit",
        data: "Works at Example Corp as Software Engineer",
        source: "Clearbit",
        confidence: 70,
      },
    ];

    return {
      scanId,
      status: "completed",
      events: demoEvents,
      progress: 100,
    };
  }
}

/**
 * Enrichment Engine for multi-pass scanning
 */
export class EnrichmentEngine {
  private sf: SpiderFootClient;
  private maxPasses: number;
  private discoveredTargets: {
    emails: Set<string>;
    usernames: Set<string>;
    phones: Set<string>;
    urls: Set<string>;
  };
  private allFindings: SpiderFootEvent[];

  constructor(maxPasses: number = 3) {
    this.sf = new SpiderFootClient();
    this.maxPasses = maxPasses;
    this.discoveredTargets = {
      emails: new Set(),
      usernames: new Set(),
      phones: new Set(),
      urls: new Set(),
    };
    this.allFindings = [];
  }

  /**
   * Run multi-pass enrichment scan
   */
  async runEnrichedScan(
    name: string,
    email: string,
    phone?: string,
    onProgress?: (progress: number, stage: string) => Promise<void> | void
  ): Promise<{ scanIds: string[]; events: SpiderFootEvent[] }> {
    const scanIds: string[] = [];
    const originalInputs = new Set([email, name]);
    if (phone) originalInputs.add(phone);

    // Pass 1: Initial scan
    await onProgress?.(10, "Starting initial scan...");

    const targets: ScanTarget[] = [
      { value: email, type: "EMAILADDR" },
      { value: name, type: "HUMAN_NAME" },
    ];
    if (phone) {
      targets.push({ value: phone, type: "PHONE_NUMBER" });
    }

    const scanId1 = await this.sf.startScan(`${name} - Pass 1`, targets);
    scanIds.push(scanId1);

    // Wait for initial scan to complete
    const pass1Results = await this.waitForScan(scanId1, async (p) => {
      await onProgress?.(10 + p * 0.4, "Scanning data sources...");
    });

    this.allFindings.push(...pass1Results.events);
    this.extractNewTargets(pass1Results.events);

    // Pass 2+: Enrichment passes
    for (let passNum = 2; passNum <= this.maxPasses; passNum++) {
      const newTargets = this.getUnseenTargets(originalInputs);

      if (newTargets.length === 0) {
        await onProgress?.(100, "No new targets to scan");
        break;
      }

      await onProgress?.(
        50 + (passNum - 2) * 20,
        `Enrichment pass ${passNum} - scanning discovered identities...`
      );

      const scanId = await this.sf.startScan(
        `${name} - Pass ${passNum}`,
        newTargets.slice(0, 10)
      );
      scanIds.push(scanId);

      const passResults = await this.waitForScan(scanId, async () => {});

      const enrichedEvents = passResults.events.map((e) => ({
        ...e,
        enrichmentPass: passNum,
      }));

      this.allFindings.push(...enrichedEvents);
      this.extractNewTargets(passResults.events);
      newTargets.forEach((t) => originalInputs.add(t.value));
    }

    await onProgress?.(100, "Scan complete");

    const dedupedFindings = this.deduplicateFindings(this.allFindings);
    return { scanIds, events: dedupedFindings };
  }

  private async waitForScan(
    scanId: string,
    onProgress: (progress: number) => Promise<void> | void
  ): Promise<ScanResult> {
    // Demo mode returns immediately
    if (scanId.startsWith("demo_")) {
      const result = await this.sf.getScanStatus(scanId);
      await onProgress(100);
      return result;
    }

    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    while (attempts < maxAttempts) {
      const result = await this.sf.getScanStatus(scanId);
      await onProgress(result.progress || 0);

      if (result.status === "completed" || result.status === "failed") {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error("Scan timeout after 10 minutes");
  }

  private extractNewTargets(events: SpiderFootEvent[]): void {
    for (const event of events) {
      if (event.type === "EMAILADDR") {
        this.discoveredTargets.emails.add(event.data);
      } else if (
        event.type === "USERNAME" ||
        event.type === "ACCOUNT_EXTERNAL_OWNED"
      ) {
        const username = this.parseUsername(event.data);
        if (username) {
          this.discoveredTargets.usernames.add(username);
        }
      } else if (event.type === "PHONE_NUMBER") {
        this.discoveredTargets.phones.add(event.data);
      } else if (event.type === "SOCIAL_MEDIA") {
        this.discoveredTargets.urls.add(event.data);
      }
    }
  }

  private parseUsername(data: string): string | null {
    const atMatch = data.match(/@(\w+)/);
    if (atMatch) return atMatch[1];

    const urlMatch = data.match(
      /(?:github\.com|twitter\.com|instagram\.com)\/(\w+)/i
    );
    if (urlMatch) return urlMatch[1];

    if (/^\w+$/.test(data.trim())) {
      return data.trim();
    }

    return null;
  }

  private getUnseenTargets(originalInputs: Set<string>): ScanTarget[] {
    const targets: ScanTarget[] = [];

    for (const email of this.discoveredTargets.emails) {
      if (!originalInputs.has(email)) {
        targets.push({ value: email, type: "EMAILADDR" });
        originalInputs.add(email);
      }
    }

    for (const username of this.discoveredTargets.usernames) {
      if (!originalInputs.has(username)) {
        targets.push({ value: username, type: "USERNAME" });
        originalInputs.add(username);
      }
    }

    return targets;
  }

  private deduplicateFindings(events: SpiderFootEvent[]): SpiderFootEvent[] {
    const seen = new Map<string, SpiderFootEvent>();

    for (const event of events) {
      const fingerprint = this.fingerprint(event);
      if (!seen.has(fingerprint)) {
        seen.set(fingerprint, event);
      }
    }

    return Array.from(seen.values());
  }

  private fingerprint(event: SpiderFootEvent): string {
    const keyData = `${event.type}:${event.data}:${event.module}`;
    return crypto.createHash("md5").update(keyData).digest("hex");
  }
}

// Export singleton client
export const spiderfootClient = new SpiderFootClient();
