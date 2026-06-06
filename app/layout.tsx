import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import ClerkNetworkRecovery from "@/components/ClerkNetworkRecovery";
import ClerkSetupNotice from "@/components/ClerkSetupNotice";
import { clerkProviderProps } from "@/lib/clerk-env";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "TurnUp",
  description: "Events for students, by students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        <ClerkProvider {...clerkProviderProps}>
          <ClerkSetupNotice />
          <ClerkNetworkRecovery />
          <div className="app-root">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}