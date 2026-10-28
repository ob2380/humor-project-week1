import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import NavBar from "@/components/NavBar";
import { GameProvider } from "@/components/GameProvider";
import { getPlayerStats } from "@/lib/game";
import { getCurrentUser } from "@/lib/auth";
import Tracker from "@/components/Tracker";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "The Humor Project",
  description: "Rate captions, make memes, level up, and climb the weekly rankings.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [stats, user] = await Promise.all([getPlayerStats(), getCurrentUser()]);

  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GameProvider initial={stats}>
          <NavBar />
          {children}
          {user && (
            <>
              <Tracker />
              <p className="px-6 py-3 text-center text-xs font-bold">
                While you&apos;re signed in, the pages you view, your votes and your meme actions are recorded for the admin dashboard.
              </p>
            </>
          )}
        </GameProvider>
      </body>
    </html>
  );
}
