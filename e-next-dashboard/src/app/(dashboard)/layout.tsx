'use client';

import React from 'react';
import { Inter, Lato } from "next/font/google";
import DashboardLayout from '@/components/layout/DashboardLayout';
import "@/app/globals.css";

//  const inter = Inter({ subsets: ["latin", "latin-ext"] });
const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  display: "swap",
});
export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={lato.className}>
      <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
} 