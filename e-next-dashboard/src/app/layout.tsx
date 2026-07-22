import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/app/globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "eNext ICU Dashboard",
  description: "Medical dashboard for eNext ICU",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={lato.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
