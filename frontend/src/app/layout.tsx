import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

export const metadata: Metadata = {
  title: "Pamodzi Finance — Save together, grow together",
  description:
    "Community savings groups (chamas / stokvels) powered by transparent digital wallets for Africa.",
};

export const viewport: Viewport = {
  themeColor: "#15935b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
