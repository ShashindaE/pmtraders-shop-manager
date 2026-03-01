import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { PusherDebug } from "@/components/PusherDebug";

export const metadata: Metadata = {
  title: "PMTraders - Shop Manager",
  description: "Shop Manager Dashboard for PMTraders",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        {/* <PusherDebug /> */}
      </body>
    </html>
  );
}
