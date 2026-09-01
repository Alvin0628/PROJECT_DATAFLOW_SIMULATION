import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

// Ini yang dibaca oleh tab browser dan SEO Google
export const metadata: Metadata = {
  title: "Data Flow Simulation Dashboard",
  description: "Production Machine Learning Command Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 
        h-screen = Tinggi fix 100% dari layar monitor. 
        overflow-hidden = Cegah scrollbar jelek di tingkat luar.
      */}
      <body
        className={`${inter.className} flex h-screen overflow-hidden bg-slate-50 text-slate-900`}
      >
        {/* Sidebar di kiri (Lebarnya sudah fix 64 di komponennya) */}
        <Sidebar />

        {/* Area Utama (Dinamis berubah sesuai rute) */}
        {/* flex-1 = Ambil sisa ruang layar, overflow-y-auto = Beri scrollbar hanya di kotak ini */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
