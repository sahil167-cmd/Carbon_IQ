import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Status", href: "/status" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30">
      <div className="flex flex-col md:flex-row justify-between items-center px-16 py-12 max-w-[1280px] mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="text-2xl font-bold text-primary">CarbonIQ</div>
          <p className="text-[13px] text-on-surface-variant">
            © 2026 CarbonIQ. Carbon Accounting & ESG Intelligence Platform.
          </p>
        </div>
        <div className="flex gap-8">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-[13px] text-on-surface-variant hover:text-primary transition-all hover:underline decoration-secondary"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-4">
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-all hover:translate-y-[-1px]"
          >
            <span className="material-symbols-outlined">public</span>
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-all hover:translate-y-[-1px]"
          >
            <span className="material-symbols-outlined">alternate_email</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
