import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

const navLinks = [
  { label: "Platform", href: "/#platform" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Network", href: "/#network" },
  { label: "Company", href: "/about" },
];

export default function TopNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
      <div className="flex justify-between items-center px-16 py-4 max-w-[1280px] mx-auto h-20">
        <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
          CarbonIQ
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={cn(
                "text-[15px] transition-all duration-200",
                pathname === link.href
                  ? "text-secondary font-semibold"
                  : "text-on-surface-variant hover:text-primary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/register"
            className="px-5 py-2.5 text-[15px] font-medium text-primary hover:opacity-80 transition-all duration-200 active:scale-95"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-[15px] font-semibold hover:opacity-90 transition-all duration-200 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
