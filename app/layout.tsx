import type { Metadata } from "next";
import { Playfair_Display, Bebas_Neue, Crimson_Pro } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

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
      <body
        className={`${playfair.variable} ${bebasNeue.variable} ${crimsonPro.variable} antialiased bg-bg-base text-text-primary min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
