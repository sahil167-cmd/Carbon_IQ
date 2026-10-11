import { useState } from "react";
import MarketingLayout from "../components/layout/MarketingLayout";

const contactChannels = [
  { label: "Partnerships", email: "partners@carboniq.ai" },
  { label: "General Inquiries", email: "hello@carboniq.ai" },
];

const recognitions = ["TECHLEADER", "LOGISTIX", "FORBES AI", "GLOBECHAIN"];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", company: "", message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }, 1500);
  };

  return (
    <MarketingLayout>
      <main className="pt-12 pb-[120px] px-5 md:px-16 max-w-[1280px] mx-auto">
        {/* Hero */}
        <header className="mb-20">
          <h1 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em] max-w-3xl">
            Let's scale your intelligence.
          </h1>
          <p className="text-[18px] leading-7 text-on-surface-variant mt-6 max-w-2xl">
            Connect with our logistics engineers to explore how predictive AI can transform your supply chain efficiency and reliability.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-12">
            {/* Offices */}
            <section>
              <h3 className="text-[13px] uppercase tracking-widest text-outline mb-6 font-medium">
                Global Headquarters
              </h3>
              <div className="space-y-8">
                <div>
                  <p className="text-2xl font-semibold mb-2">San Francisco</p>
                  <p className="text-[15px] text-on-surface-variant">
                    450 Market Street, Suite 2100<br />San Francisco, CA 94105
                  </p>
                  <div className="mt-4 w-full h-32 rounded-xl overflow-hidden bg-surface-container grayscale hover:grayscale-0 transition-all duration-500">
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAPfkzzTs0IMJcBqWCSSvnfn1SRpJA3C5OYB0DbLkPNmEFxJIP_wuNFPrhX_D1U3knMqBef642jJJkzbGEPutyJ7R4MAMOf41XlcdoKzKij4uOHG53zuzL8v9HSSnjcWUbTemP17FxjlN9sWnEZHjeOjeQMOqSIRblLqLCOhEsO6XJckexjwOsDubtNDcIpGa4g5dEHGRaV70AoIQbEJXansjaSSmrp9j2wQ0vTHvbDqVft-IGqLc0')" }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold mb-2">London</p>
                  <p className="text-[15px] text-on-surface-variant">
                    King's Cross Road, The Stanley Building<br />London, WC1X 9AS
                  </p>
                </div>
              </div>
            </section>

            {/* Support channels */}
            <section className="p-8 rounded-[20px] border border-outline-variant/30 bg-white ambient-shadow">
              <h3 className="text-[13px] uppercase tracking-widest text-outline mb-6 font-medium">
                Direct Support
              </h3>
              <div className="space-y-6">
                {contactChannels.map((c) => (
                  <div key={c.label}>
                    <p className="text-[15px] text-outline">{c.label}</p>
                    <a
                      href={`mailto:${c.email}`}
                      className="text-2xl font-semibold hover:text-secondary transition-colors"
                    >
                      {c.email}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 md:p-12 rounded-[20px] border border-outline-variant/30 ambient-shadow">
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {["first_name", "last_name"].map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="text-[13px] text-on-surface-variant ml-1 capitalize" htmlFor={field}>
                        {field.replace("_", " ")}
                      </label>
                      <input
                        id={field}
                        type="text"
                        placeholder={field === "first_name" ? "Jane" : "Doe"}
                        value={form[field as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        className="w-full px-4 py-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-[15px]"
                      />
                    </div>
                  ))}
                </div>
                {[
                  { id: "email", label: "Work Email", type: "email", placeholder: "jane@company.com" },
                  { id: "company", label: "Company", type: "text", placeholder: "Logistics Corp" },
                ].map((f) => (
                  <div key={f.id} className="space-y-2">
                    <label className="text-[13px] text-on-surface-variant ml-1" htmlFor={f.id}>{f.label}</label>
                    <input
                      id={f.id}
                      type={f.type}
                      placeholder={f.placeholder}
                      value={form[f.id as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                      className="w-full px-4 py-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-[15px]"
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant ml-1" htmlFor="message">Project Details</label>
                  <textarea
                    id="message"
                    rows={5}
                    placeholder="Tell us about your fleet operations or supply chain goals..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-[15px] resize-none"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-secondary text-white py-5 rounded-xl text-2xl font-bold shadow-lg hover:bg-secondary/90 transition-all active:scale-[0.98] flex justify-center items-center gap-3"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    ) : submitted ? (
                      <>
                        <span className="material-symbols-outlined">check_circle</span> Sent!
                      </>
                    ) : (
                      <>
                        Send Message{" "}
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[13px] text-outline mt-4">
                    By clicking send, you agree to our processing of your information as described in our Privacy Policy.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Recognitions */}
        <section className="mt-[120px] grid grid-cols-2 md:grid-cols-4 gap-6 opacity-40 grayscale">
          {recognitions.map((r) => (
            <div key={r} className="flex items-center justify-center p-4">
              <span className="text-2xl font-black tracking-tighter">{r}</span>
            </div>
          ))}
        </section>
      </main>
    </MarketingLayout>
  );
}
