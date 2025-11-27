"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, MapPin, User, AlertTriangle, Eye, Database } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Digital Bodyguard</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            What Can a Stalker Find About You?
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your personal data is scattered across hundreds of sites. Data brokers,
            breaches, social media - it&apos;s all findable. See your full digital exposure.
          </p>
          <Link href="/register">
            <Button size="lg" className="text-lg px-8 py-6 h-auto">
              Start Free Audit
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Takes 5 minutes. See your full exposure.
          </p>
        </div>
      </section>

      {/* Risk Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Data Breaches</h3>
              <p className="text-muted-foreground text-sm">
                Passwords exposed in data leaks from sites you&apos;ve used
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <MapPin className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Location Exposure</h3>
              <p className="text-muted-foreground text-sm">
                Home and work addresses findable from photos and records
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <User className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Hidden Profiles</h3>
              <p className="text-muted-foreground text-sm">
                Social accounts you forgot existed, still publicly visible
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Verify Your Identity</h3>
              <p className="text-muted-foreground text-sm">
                So only YOU can see YOUR data. Government ID + selfie verification.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">We Scan 200+ Sources</h3>
              <p className="text-muted-foreground text-sm">
                Data brokers, breaches, social media, dark web - comprehensive scan in 5 minutes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Get Your Risk Report</h3>
              <p className="text-muted-foreground text-sm">
                See exactly what&apos;s exposed and how vulnerable you are.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Find */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">What We Discover</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
              <h4 className="font-semibold mb-1">Compromised Passwords</h4>
              <p className="text-sm text-muted-foreground">
                Credentials leaked in data breaches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Eye className="h-8 w-8 text-orange-500 mb-3" />
              <h4 className="font-semibold mb-1">Dark Web Mentions</h4>
              <p className="text-sm text-muted-foreground">
                Your info on underground forums
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Database className="h-8 w-8 text-purple-500 mb-3" />
              <h4 className="font-semibold mb-1">Data Broker Listings</h4>
              <p className="text-sm text-muted-foreground">
                Sites selling your personal info
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <User className="h-8 w-8 text-blue-500 mb-3" />
              <h4 className="font-semibold mb-1">Social Footprint</h4>
              <p className="text-sm text-muted-foreground">
                All your public profiles across platforms
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-slate-900 text-white py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <blockquote className="text-2xl font-medium mb-6">
            &quot;I had no idea my home address was on 12 different sites. This was eye-opening.&quot;
          </blockquote>
          <cite className="text-slate-400">- Early user</cite>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Take Control of Your Digital Privacy</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Know what&apos;s out there about you. The first step to protecting yourself
          is understanding your exposure.
        </p>
        <Link href="/register">
          <Button size="lg" className="text-lg px-8 py-6 h-auto">
            Start Your Free Audit
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Digital Bodyguard. All rights reserved.</p>
          <p className="mt-2">
            Your data is encrypted and never shared. We only show YOU your data.
          </p>
        </div>
      </footer>
    </div>
  );
}
