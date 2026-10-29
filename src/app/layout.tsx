import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Providers } from "../components/providers";

export const metadata: Metadata = {
  title: "LushAIEdu · AI Content Admin",
  icons: { icon: "/brand-favicon-32.png", shortcut: "/brand-favicon.ico", apple: "/brand-apple-touch.png" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} antialiased`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
