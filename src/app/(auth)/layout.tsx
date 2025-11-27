import Link from "next/link";
import { Shield } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">Digital Bodyguard</span>
        </Link>
        <div className="max-w-md mx-auto">{children}</div>
      </div>
    </div>
  );
}
