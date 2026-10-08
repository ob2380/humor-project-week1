import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import NavBar from "@/components/NavBar";
import { GameProvider } from "@/components/GameProvider";
import { getPlayerStats } from "@/lib/game";
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
  const stats = await getPlayerStats();

  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GameProvider initial={stats}>
          <NavBar />
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
