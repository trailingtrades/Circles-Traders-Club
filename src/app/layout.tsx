import type { Metadata } from "next";
import "./globals.css";

const APP_NAME = process.env.APP_NAME || "Circles Traders Club";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Secure learning portal for enrolled students.",
  robots: { index: false, follow: false },
};

// Applies the saved theme before first paint to avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem("ctc-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
