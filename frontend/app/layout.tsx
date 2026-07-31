import type { Metadata, Viewport } from "next";
import { AuthProvider } from "./auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Coin Engine",
    template: "%s · Coin Engine"
  },
  applicationName: "Coin Engine",
  description: "繁體中文個人財務作業系統，追蹤帳戶、交易、信用卡、目標與 Personal HUD。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Coin Engine",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icon.png",
    apple: "/icons/coin-engine-icon-192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#071018"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
