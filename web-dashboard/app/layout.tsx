import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Data Flow Simulation | MLOps Command Center",
  description: "Production machine learning and business intelligence command center",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.className} flex min-h-screen bg-background text-foreground`}>
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-5 py-6 md:px-8 md:py-8 lg:px-10">{children}</div>
        </main>
      </body>
    </html>
  );
}
