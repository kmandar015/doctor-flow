import type { Metadata } from "next";
import { AppFrame } from "./components/AppFrame";
import { ToastProvider } from "./components/ToastContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doctor Flow",
  description: "A simpler way to manage your practice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppFrame>{children}</AppFrame>
        </ToastProvider>
      </body>
    </html>
  );
}
