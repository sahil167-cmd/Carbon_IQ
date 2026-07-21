import { ReactNode } from "react";
import TopNav from "./TopNav";
import Footer from "./Footer";

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
