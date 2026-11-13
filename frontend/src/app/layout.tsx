import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "CoC Analitik • Clash of Clans İstatistik ve Strateji Platformu",
  description:
    "Clash of Clans oyuncu ve klan analitiği, TH18 meta orduları, CWL keşfi, cevher simülatörü ve duvar yazısı planlayıcı.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
