"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({
  intervalMs = 60000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    // Set interval for refresh
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
