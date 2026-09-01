'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    // Set interval untuk me-refresh halaman di background
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    // Bersihkan interval saat komponen di-unmount
    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null; // Tidak merender UI apa pun, murni berjalan di background
}