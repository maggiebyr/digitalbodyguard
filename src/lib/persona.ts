/**
 * Persona Identity Verification
 * Server-side utilities for verifying Persona inquiries
 */

interface PersonaInquiryResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      status: string;
      "reference-id"?: string;
      "name-first"?: string;
      "name-last"?: string;
      "email-address"?: string;
      "created-at": string;
      "completed-at"?: string;
    };
  };
}

export interface VerificationResult {
  verified: boolean;
  error?: string;
  nameFirst?: string;
  nameLast?: string;
  email?: string;
}

/**
 * Retrieve and verify a Persona inquiry
 */
export async function verifyPersonaInquiry(
  inquiryId: string,
  expectedName: string,
  expectedEmail: string
): Promise<VerificationResult> {
  const apiKey = process.env.PERSONA_API_KEY;

  // Demo mode for development
  if (!apiKey || inquiryId.startsWith("demo_")) {
    console.warn("Persona API key not configured or demo inquiry. Simulating verification.");
    return {
      verified: true,
      nameFirst: expectedName.split(" ")[0],
      nameLast: expectedName.split(" ").slice(1).join(" "),
      email: expectedEmail,
    };
  }

  try {
    const response = await fetch(
      `https://withpersona.com/api/v1/inquiries/${inquiryId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Persona-Version": "2023-01-05",
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Persona API error:", errorData);
      return { verified: false, error: "Failed to retrieve inquiry" };
    }

    const data: PersonaInquiryResponse = await response.json();
    const attrs = data.data.attributes;

    // Check inquiry is approved
    if (attrs.status !== "approved" && attrs.status !== "completed") {
      return {
        verified: false,
        error: `Identity verification status: ${attrs.status}`,
      };
    }

    // Get verified name from inquiry
    const verifiedFirstName = attrs["name-first"] || "";
    const verifiedLastName = attrs["name-last"] || "";
    const verifiedFullName = `${verifiedFirstName} ${verifiedLastName}`
      .toLowerCase()
      .trim();

    // Fuzzy match name (allow for slight variations)
    const inputName = expectedName.toLowerCase().trim();
    if (!fuzzyNameMatch(verifiedFullName, inputName)) {
      return {
        verified: false,
        error: "Name does not match verified identity",
      };
    }

    return {
      verified: true,
      nameFirst: verifiedFirstName,
      nameLast: verifiedLastName,
      email: attrs["email-address"],
    };
  } catch (error) {
    console.error("Persona verification error:", error);
    return { verified: false, error: "Failed to verify identity" };
  }
}

/**
 * Fuzzy name matching for slight variations
 */
function fuzzyNameMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

  const aNorm = normalize(a);
  const bNorm = normalize(b);

  // Exact match
  if (aNorm === bNorm) return true;

  // One contains the other
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;

  // First + last name match
  const aParts = a.split(/\s+/);
  const bParts = b.split(/\s+/);

  const aFirst = normalize(aParts[0] || "");
  const aLast = normalize(aParts[aParts.length - 1] || "");
  const bFirst = normalize(bParts[0] || "");
  const bLast = normalize(bParts[bParts.length - 1] || "");

  if (aFirst === bFirst && aLast === bLast) return true;

  // Allow for middle name differences
  if (aFirst === bFirst || aLast === bLast) {
    // At least first or last matches, check similarity
    const similarity = calculateSimilarity(aNorm, bNorm);
    if (similarity > 0.7) return true;
  }

  return false;
}

/**
 * Calculate string similarity (Jaccard coefficient of character bigrams)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);

  const intersection = new Set([...aBigrams].filter((x) => bBigrams.has(x)));
  const union = new Set([...aBigrams, ...bBigrams]);

  return intersection.size / union.size;
}
