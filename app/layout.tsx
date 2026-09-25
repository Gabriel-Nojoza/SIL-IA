import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SIL Chat",
  description: "Chat de IA da SIL para consulta e análise de dados comerciais.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SIL Chat",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={sora.variable}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
