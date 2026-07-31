import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coin Engine",
    short_name: "Coin",
    description: "Coin Engine 是個人財務作業系統，用於追蹤帳戶、交易、信用卡、目標與 Personal HUD。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#071018",
    theme_color: "#071018",
    icons: [
      {
        src: "/icons/coin-engine-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/coin-engine-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/coin-engine-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/coin-engine-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
