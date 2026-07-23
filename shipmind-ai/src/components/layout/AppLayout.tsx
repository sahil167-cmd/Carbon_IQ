import type { ReactNode } from "react";
import SideNav from "./SideNav";
import AppHeader from "./AppHeader";
import Footer from "./Footer";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <SideNav />
      <main className="ml-64 min-h-screen flex flex-col">
        <AppHeader title={title} subtitle={subtitle} />
        <div className="flex-1 pt-16">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
