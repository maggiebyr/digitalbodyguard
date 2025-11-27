"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Info, Loader2 } from "lucide-react";
import { PersonaVerification } from "@/components/PersonaVerification";

export default function NewAuditPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify" | "starting">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    // Move to verification step
    setStep("verify");
  }

  async function handleVerificationComplete(inquiryId: string) {
    setStep("starting");
    setIsLoading(true);

    try {
      const res = await fetch("/api/audit/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          persona_inquiry_id: inquiryId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start audit");
        setStep("form");
        setIsLoading(false);
        return;
      }

      // Redirect to status page
      router.push(`/audit/${data.scan_id}`);
    } catch {
      setError("An error occurred. Please try again.");
      setStep("form");
      setIsLoading(false);
    }
  }

  function handleVerificationCancel() {
    setStep("form");
  }

  function handleVerificationError(err: Error) {
    setError(`Verification failed: ${err.message}`);
    setStep("form");
  }

  if (step === "starting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Digital Bodyguard</span>
          </Link>
          <div className="max-w-lg mx-auto text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-semibold mb-2">Starting Your Audit</h2>
            <p className="text-muted-foreground">
              Please wait while we initialize your scan...
            </p>
          </div>
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

        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Start Your Audit</CardTitle>
              <CardDescription>
                {step === "form"
                  ? "Enter the information you want us to search for"
                  : "Verify your identity to continue"}
              </CardDescription>
            </CardHeader>

            {step === "form" ? (
              <form onSubmit={handleFormSubmit}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Legal Name (as it appears on your ID)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number{" "}
                      <span className="text-muted-foreground">(optional - improves accuracy)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (415) 555-1234"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    Continue
                  </Button>

                  <Separator />

                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Why do we need this?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        We verify your identity to ensure you can only look up yourself - not
                        others. Your data is encrypted and never shared.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </form>
            ) : (
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg mb-4">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-blue-900">Identity Verification</p>
                    <p className="text-sm text-blue-700 mt-1">
                      We use Persona to verify your identity with a government ID and selfie.
                      This ensures only you can access your data.
                    </p>
                  </div>
                </div>

                <PersonaVerification
                  onSuccess={handleVerificationComplete}
                  onCancel={handleVerificationCancel}
                  onError={handleVerificationError}
                  prefillData={{ name, email }}
                />

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep("form")}
                >
                  Back to form
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
