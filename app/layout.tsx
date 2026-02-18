import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Council — Survivor Fantasy League",
  description:
    "Play Survivor fantasy with friends. Draft castaways, earn points, and claim the fire.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg-base text-text-primary min-h-screen">
        {children}
      </body>
    </html>
  );
}
