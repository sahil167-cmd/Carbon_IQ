import { Link } from "react-router-dom";
import MarketingLayout from "../components/layout/MarketingLayout";

const teamMembers = [
  {
    name: "Elena Voss",
    role: "Co-Founder & CEO",
    bio: "Former Head of Global Logistics at major tech firm.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDj3vf5Az8CSX7B3wIStyPOeKwnVFRFa-G-6kUwx_JJhhUbipzPiIFhzub1G_lOZ93EM2jdhoWe-2RCdVJNfsm-6JKdiMgCKxrv1wcZr2BwLtSJh4m0zefaoDyOzVb-eSZLjl0BwhO7h9UFgFI4EF0gfETKe1KzSGsyqJJTIGVXk-rBWdTxTeOAWxH7MCwrK8JfMS6HmLTYPySDbxK3L-I5atyYb2WLLLEMX8VeqNsNdI9dm4RJ4oc",
  },
  {
    name: "Dr. Marcus Chen",
    role: "Co-Founder & CTO",
    bio: "PhD in Neural Networks and former AI Lead at DeepMind.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCTirtphLytj8CMFTQb0EVA0jehr4Yl2b80IVtPbGIMTzWMWT29shtzeCFzM-wwgyL5FOqSpsa_pOeUCqwLy4WCGCSf4IVupdSr3_v-SQosbDKEacAHbxYFVfpJrlYTJhjy3xGgOiw471JTv9AR2Q_ri0QNE0PultAqThbvwWcMsWjE-zUkXOcnn9PucJC7r_YcEkKnZMPGlgXUf8-7D-hBTvdI2FKiTJregXL2isvhS4CUzM5fVt0",
  },
  {
    name: "Sarah Jenkins",
    role: "VP of Operations",
    bio: "20 years of freight forwarding experience across APAC.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJ03XMMg_COIQpmRE0svllVTRCNg-vWIFcbvM-1T0k0hmMUINve_nkmag7fhCIOfbo4seVsBrDcNqF5xFwXiB2GiC2rPdgPHV3VlAQW4KgdmkxW8EdCnH6EndaY3n8VfMO4KwdoFy8L3l7KndFnIrw3Rw7JspI-hWg22ALYi4pC1ygovZ0zT9xRPijXSLYT_XkGr4NwKIIw7Y7F-nODKBo0kHjzsG8WzXUmwNkXHeS4rIWkQ0b9Kw",
  },
  {
    name: "Julian Aris",
    role: "Head of Product",
    bio: "Previously led design for industry-leading SaaS platforms.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUDurACCDcFBdKxO5RqjeaDyA5QjeaGMm2rc4L1079CyPMlvZ5oZ5biYEd3vivJe9ceaFBQqqSk7HRS0Q8FfTpTvRxgX2AWvTFefwWNu5p2WwBKCJVUXs2af6hGxCrrYba4qu-H8OZcZah7zDm0lraP0aRGQvThtjhhuYkojhzX4ikMmxgN1RhpHuq4VGd8qhr962ZvJkdJKNIBMDfTqD94uVv8rU0LH6ri4AEQGjW4GJ4BaofCQA",
  },
];

const pillars = [
  { icon: "auto_mode", title: "Autonomy", body: "Moving beyond simple tracking to active, autonomous decision-making that resolves delays before they occur." },
  { icon: "insights", title: "Intelligence", body: "Aggregating billions of data points into a single, crystalline source of truth for global logistics operations." },
  { icon: "public", title: "Resilience", body: "Building a supply chain that can withstand global shocks through decentralized, AI-driven routing." },
  { icon: "eco", title: "Efficiency", body: "Reducing global carbon emissions by optimizing every cubic inch of freight and every mile of travel." },
];

export default function About() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="px-16 max-w-[1280px] mx-auto py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-8">
            <span className="text-[13px] uppercase tracking-widest text-secondary font-bold">
              Predictive Serenity
            </span>
            <h1 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em]">
              Automating the world's <br />supply chain network.
            </h1>
            <p className="text-[18px] leading-7 text-on-surface-variant max-w-xl">
              Logistics is the heartbeat of global commerce, yet it remains fragmented and reactive. ShipMind AI was born from a singular vision: to build the autonomous operating system for trade, turning complex global movement into a seamless, predictive experience.
            </p>
          </div>
          <div className="lg:col-span-5 relative mt-12 lg:mt-0">
            <div className="rounded-[20px] overflow-hidden border border-outline-variant/30 ambient-shadow">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWdmNAYfghHkKXip-fs0LILwHasgHE3qby14L7L1z8VSeyb9QGzPNs3ofaRh-nT9urVVjHgj85bJEW9QIGrG57QcwC3ArroHX3oxMLHYJjAuQZtf0Gan8zYkaVuNGMTgNFfUYnTtDA0o91gSU2gExjZpA3eceOYExWNCOG_9XpSdg-M9VBTY81alMhTxHDob2EBDKk0EkMzjREIgAH4CwXTqBpIpLD2m32WKsCiv4-Z7AKSf1vyOQ"
                alt="Container port at dusk"
                className="w-full aspect-[4/5] object-cover"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 glass p-8 rounded-[20px] border border-outline-variant/30 shadow-xl hidden md:block max-w-[240px]">
              <p className="text-[48px] font-bold leading-none mb-2 text-primary">99.8%</p>
              <p className="text-[13px] text-on-surface-variant">
                Arrival precision powered by our proprietary Neural Route Engine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-surface-container-lowest py-[120px] border-y border-outline-variant/20">
        <div className="px-16 max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              <h2 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] sticky top-32">
                Our Mission
              </h2>
            </div>
            <div className="md:w-2/3 space-y-12">
              <p className="text-2xl font-semibold leading-relaxed text-on-surface-variant">
                We believe that global trade shouldn't be a source of stress. It should be an invisible utility that just works.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pillars.map((p) => (
                  <div key={p.title} className="space-y-4">
                    <span className="material-symbols-outlined text-secondary text-4xl">{p.icon}</span>
                    <h3 className="text-2xl font-semibold">{p.title}</h3>
                    <p className="text-[15px] leading-6 text-on-surface-variant">{p.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-16 max-w-[1280px] mx-auto py-[120px]">
        <div className="text-center mb-20">
          <h2 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] mb-6">
            Built by Operators &amp; Engineers
          </h2>
          <p className="text-[18px] leading-7 text-on-surface-variant max-w-2xl mx-auto">
            Our team combines deep logistics expertise with world-class engineering from the world's leading technology labs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((m) => (
            <div
              key={m.name}
              className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2"
            >
              <div className="rounded-[20px] overflow-hidden mb-6 aspect-square border border-outline-variant/30 grayscale hover:grayscale-0 transition-all duration-500 relative">
                <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h4 className="text-2xl font-semibold">{m.name}</h4>
              <p className="text-[13px] text-secondary font-bold uppercase tracking-wider mt-1">{m.role}</p>
              <p className="text-[15px] text-on-surface-variant mt-2">{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-16 max-w-[1280px] mx-auto mb-[120px]">
        <div className="relative bg-tertiary text-on-primary rounded-[20px] overflow-hidden p-12 md:p-24 text-center">
          <div className="relative z-10 space-y-8">
            <h2 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em]">
              Ready to build the <br />future of trade?
            </h2>
            <p className="text-[18px] leading-7 text-on-primary/70 max-w-xl mx-auto">
              Join a team of visionaries solving the world's most complex physical challenges with pure intelligence.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <button className="bg-secondary text-on-secondary px-10 py-4 rounded-xl text-[13px] font-bold hover:scale-105 transition-transform">
                View Open Positions
              </button>
              <Link
                to="/contact"
                className="border border-on-primary/30 text-on-primary px-10 py-4 rounded-xl text-[13px] font-bold hover:bg-on-primary/10 transition-colors"
              >
                Contact Our Team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
