import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support AI SaaS",
  description: "Multi-tenant AI customer support — grounded in your docs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
