"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";

interface WaitlistFormProps {
  scanId?: string;
  defaultEmail?: string;
}

export function WaitlistForm({ scanId, defaultEmail }: WaitlistFormProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          scan_id: scanId,
          source: "results_page",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join waitlist");
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setPosition(data.position);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-lg">You&apos;re on the list!</p>
        {position && (
          <p className="text-muted-foreground mt-1">
            {position.toLocaleString()} people ahead of you
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          We&apos;ll email you when the data removal service launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Notify Me"
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
