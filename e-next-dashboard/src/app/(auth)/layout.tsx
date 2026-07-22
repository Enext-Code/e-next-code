'use client';

import React from 'react';
import { Inter } from "next/font/google";
// import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-white`}>
      {children}
    </div>
  );
} 