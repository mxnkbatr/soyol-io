"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen">
      {children}
    </div>
  );
}
