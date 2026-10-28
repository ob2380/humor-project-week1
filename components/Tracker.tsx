"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/track";

/** Records a page view on every navigation, plus a heartbeat while the tab is visible. */
export default function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view");
  }, [pathname]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") track("heartbeat");
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
