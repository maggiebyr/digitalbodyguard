import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Bodyguard - See What a Stalker Can Find About You",
  description:
    "Discover your digital exposure with our comprehensive personal data audit. Find out what personal information is publicly accessible about you online.",
  keywords: [
    "personal data audit",
    "privacy",
    "stalking prevention",
    "data brokers",
    "online safety",
    "digital footprint",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
