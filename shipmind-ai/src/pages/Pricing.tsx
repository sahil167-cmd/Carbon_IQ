import { useState } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "../components/layout/MarketingLayout";

interface Plan {
  name: string;
  description: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  features: string[];
  popular: boolean;
  cta: string;
  href: string;
}

const plans: Plan[] = [
  {
    name: "Starter",
    description: "For small fleets and regional operations.",
    priceMonthly: 299,
    priceAnnual: 249,
    features: [
      "Up to 10 active shipments",
      "Real-time tracking",
      "Basic route optimization",
      "Email support",
    ],
    popular: false,
    cta: "Start with Starter",
    href: "/register",
  },
  {
    name: "Professional",
    description: "Comprehensive AI intelligence for growing businesses.",
    priceMonthly: 899,
    priceAnnual: 749,
    features: [
      "Unlimited shipments",
      "Predictive delay warnings",
      "Advanced AI route engine",
      "Priority 24/7 support",
      "Custom document automation",
    ],
    popular: true,
    cta: "Go Professional",
    href: "/register",
  },
  {
    name: "Enterprise",
    description: "Full-scale logistics ecosystem for global enterprises.",
    priceMonthly: null,
    priceAnnual: null,
    features: [
      "Everything in Professional",
      "Custom API integrations",
      "Dedicated fleet intelligence",
      "White-label client portal",
    ],
    popular: false,
    cta: "Contact Sales",
    href: "/contact",
  },
];

const tableRows = [
  { feature: "Shipment Limit", starter: "10 Active", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Fleet Intelligence", starter: "Basic", pro: "Predictive", enterprise: "Custom AI Models" },
  { feature: "Route Optimization", starter: true, pro: true, enterprise: true },
  { feature: "ML-driven Weather Routing", starter: false, pro: true, enterprise: true },
  { feature: "Document OCR", starter: false, pro: true, enterprise: true },
  { feature: "Support SLA", starter: "48 Hours", pro: "Priority 2h", enterprise: "Dedicated Rep" },
  { feature: "API Access", starter: false, pro: false, enterprise: true },
];

function CellValue({ v }: { v: string | boolean }) {
  if (v === true) return <span className="material-symbols-outlined text-secondary">check</span>;
  if (v === false) return <span className="text-on-surface-variant/40">—</span>;
  return <span className="text-[15px]">{v}</span>;
}

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <MarketingLayout>
      <main className="pt-12 pb-[120px]">
        {/* Hero */}
        <section className="max-w-[1280px] mx-auto px-16 text-center mb-16">
          <h1 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em] mb-6">
            Predictive Serenity in Pricing
          </h1>
          <p className="text-[18px] leading-7 text-on-surface-variant max-w-2xl mx-auto mb-10">
            Choose the plan that fits your supply chain complexity. Transparent, scalable, and built for modern logistics excellence.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <span className={`text-[13px] font-medium ${!isAnnual ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual((p) => !p)}
              className="w-14 h-7 bg-surface-container-high rounded-full p-1 relative flex items-center"
              aria-label="Toggle billing"
            >
              <div
                className={`w-5 h-5 bg-primary rounded-full transition-transform duration-300 ${isAnnual ? "translate-x-7" : "translate-x-0"}`}
              />
            </button>
            <span className={`text-[13px] ${isAnnual ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
              Annual (Save 20%)
            </span>
          </div>
        </section>

        {/* Cards */}
        <section className="max-w-[1280px] mx-auto px-16 grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-surface-container-lowest rounded-[24px] p-10 flex flex-col transition-all ${
                plan.popular
                  ? "border-2 border-primary shadow-[0_20px_50px_rgba(0,0,0,0.08)] scale-105 z-10 relative"
                  : "border border-outline-variant/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-[13px] font-bold tracking-wider uppercase">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-[15px] text-on-surface-variant">{plan.description}</p>
              </div>
              <div className="mb-8">
                {plan.priceAnnual !== null ? (
                  <>
                    <span className="text-4xl font-bold">$</span>
                    <span className="text-5xl font-bold transition-all duration-300">
                      {isAnnual ? plan.priceAnnual : plan.priceMonthly}
                    </span>
                    <span className="text-on-surface-variant text-[15px]">/mo</span>
                  </>
                ) : (
                  <span className="text-5xl font-bold">Custom</span>
                )}
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[15px]">
                    <span
                      className="material-symbols-outlined text-secondary text-[20px]"
                      style={plan.popular ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      check_circle
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.href}
                className={`w-full py-4 rounded-xl text-center font-semibold transition-all active:scale-95 ${
                  plan.popular
                    ? "bg-primary text-white hover:opacity-90"
                    : "border border-outline text-primary hover:bg-surface-container-high"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </section>

        {/* Comparison Table */}
        <section className="max-w-[1280px] mx-auto px-16 overflow-hidden">
          <h2 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] mb-12 text-center">
            Feature Breakdown
          </h2>
          <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/30 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container">
                  {["Features", "Starter", "Professional", "Enterprise"].map((h, i) => (
                    <th
                      key={h}
                      className={`p-6 text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/20 ${i === 2 ? "bg-primary/5" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {tableRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="p-6 text-[15px] font-medium">{row.feature}</td>
                    <td className="p-6 text-[15px]"><CellValue v={row.starter} /></td>
                    <td className="p-6 text-[15px] bg-primary/5 font-semibold"><CellValue v={row.pro} /></td>
                    <td className="p-6 text-[15px]"><CellValue v={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
