// =============================================================================
// ConstrutorPro - Root Layout
// =============================================================================

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SetupCheck } from "@/components/setup-check";
import { SkipLink } from "@/components/accessibility/skip-link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: "ConstrutorPro - Gestão de Construção",
    template: "%s | ConstrutorPro",
  },
  description: "Plataforma premium de gestão de construção para o mercado brasileiro. Controle projetos, orçamentos, cronogramas, fornecedores e muito mais.",
  keywords: [
    "construtora",
    "gestão de obras",
    "orçamento de construção",
    "cronograma de obras",
    "diário de obra",
    "engenharia civil",
    "construção civil",
    "Brasil",
  ],
  authors: [{ name: "ConstrutorPro Team" }],
  creator: "ConstrutorPro",
  publisher: "ConstrutorPro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://construtorpro.com.br",
    siteName: "ConstrutorPro",
    title: "ConstrutorPro - Gestão de Construção",
    description: "Plataforma premium de gestão de construção para o mercado brasileiro.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ConstrutorPro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConstrutorPro - Gestão de Construção",
    description: "Plataforma premium de gestão de construção para o mercado brasileiro.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Skip Navigation Link - WCAG 2.1 Bypass Blocks */}
        <SkipLink targetId="main-content" label="Pular para o conteúdo principal" />
        
        <SetupCheck>{children}</SetupCheck>
      </body>
    </html>
  );
}
