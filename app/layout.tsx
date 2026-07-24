import type { Metadata } from "next";
import { Varela_Round, Nunito_Sans } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/context";
import "./globals.css";

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  weight: "400",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pindo 拼豆图纸生成器",
  description: "本地拼豆图纸生成器。上传图片，选择品牌、颜色筛选、尺寸和创作模式，导出带色号与用量统计的拼豆图纸。",
  keywords: "拼豆,图纸生成器,perler beads,hama beads,artkal beads,pixel art,bead pattern,拼豆图纸,像素画",
  manifest: "/manifest.json",
  openGraph: {
    title: "Pindo 拼豆图纸生成器",
    description: "上传图片生成带色号和用量统计的拼豆图纸。",
    type: "website",
  },
  other: {
    "theme-color": "#F472B6",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${varelaRound.variable} ${nunitoSans.variable} antialiased`}
      >
        <I18nProvider>{children}</I18nProvider>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js')` }} />
      </body>
    </html>
  );
}
