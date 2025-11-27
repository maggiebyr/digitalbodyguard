"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, CheckCircle } from "lucide-react";

interface PersonaVerificationProps {
  onSuccess: (inquiryId: string, fields?: Record<string, string>) => void;
  onCancel: () => void;
  onError: (error: Error) => void;
  prefillData?: {
    name?: string;
    email?: string;
  };
}

declare global {
  interface Window {
    Persona?: {
      Client: new (options: {
        templateId: string;
        environmentId: string;
        referenceId?: string;
        fields?: Record<string, string>;
        onReady?: () => void;
        onComplete?: (args: {
          inquiryId: string;
          status: string;
          fields: Record<string, string>;
        }) => void;
        onCancel?: () => void;
        onError?: (error: Error) => void;
      }) => {
        open: () => void;
        destroy: () => void;
      };
    };
  }
}

export function PersonaVerification({
  onSuccess,
  onCancel,
  onError,
  prefillData,
}: PersonaVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Load Persona SDK script
  useEffect(() => {
    if (typeof window !== "undefined" && window.Persona) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.withpersona.com/dist/persona-v5.0.0.js";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => onError(new Error("Failed to load Persona SDK"));
    document.body.appendChild(script);

    return () => {
      // Cleanup if component unmounts before script loads
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [onError]);

  const startVerification = useCallback(() => {
    if (!window.Persona) {
      onError(new Error("Persona SDK not loaded"));
      return;
    }

    const templateId = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID;
    const environmentId = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID;

    if (!templateId || !environmentId) {
      // For development/demo, simulate verification
      console.warn("Persona credentials not configured. Using demo mode.");
      setIsLoading(true);
      setTimeout(() => {
        setIsComplete(true);
        setIsLoading(false);
        // Generate a demo inquiry ID
        onSuccess(`demo_inq_${Date.now()}`);
      }, 2000);
      return;
    }

    setIsLoading(true);

    const client = new window.Persona.Client({
      templateId,
      environmentId,
      fields: prefillData
        ? {
            nameFirst: prefillData.name?.split(" ")[0] || "",
            nameLast: prefillData.name?.split(" ").slice(1).join(" ") || "",
            emailAddress: prefillData.email || "",
          }
        : undefined,
      onReady: () => {
        client.open();
      },
      onComplete: ({ inquiryId, status, fields }) => {
        setIsLoading(false);
        if (status === "completed") {
          setIsComplete(true);
          onSuccess(inquiryId, fields);
        } else {
          onError(new Error(`Verification status: ${status}`));
        }
      },
      onCancel: () => {
        setIsLoading(false);
        onCancel();
      },
      onError: (error) => {
        setIsLoading(false);
        onError(error);
      },
    });
  }, [onSuccess, onCancel, onError, prefillData]);

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <p className="text-lg font-medium">Identity Verified</p>
        <p className="text-muted-foreground text-sm">Starting your audit...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary/5 p-8 rounded-full mb-6">
        <Shield className="h-16 w-16 text-primary" />
      </div>

      <Button
        onClick={startVerification}
        disabled={!isScriptLoaded || isLoading}
        size="lg"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening verification...
          </>
        ) : !isScriptLoaded ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          "Verify Your Identity"
        )}
      </Button>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Verification powered by Persona. Your ID is only used to confirm
        your identity and is not stored.
      </p>
    </div>
  );
}
