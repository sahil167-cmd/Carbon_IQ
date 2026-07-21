import AppLayout from "../../components/layout/AppLayout";
import { useState } from "react";

const faq = [
  { q: "How do I configure my ERP connection?", a: "Go to Settings > Integrations and select your ERP vendor. You will need your organization ID and API credentials." },
  { q: "What document formats are supported?", a: "We support PDF, PNG, JPG, and multi-page TIFF files up to 50MB." },
  { q: "How long does AI extraction take?", a: "Standard documents take 2-4 seconds. Pro/Priority processing takes under 1.5 seconds." },
  { q: "Can I train custom models?", a: "Yes, Enterprise customers can train custom extraction models by uploading 50+ sample documents of a specific layout." },
];

export default function Support() {
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitting(true);
    setTimeout(() => {
      setTicketSubmitting(false);
      setTicketSubmitted(true);
      setTimeout(() => setTicketSubmitted(false), 3000);
    }, 1500);
  };

  return (
    <AppLayout title="Support Center" subtitle="Get Help &amp; FAQs">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAQ list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
              <h3 className="text-[18px] font-bold mb-6">Frequently Asked Questions</h3>
              <div className="space-y-6">
                {faq.map((item) => (
                  <div key={item.q} className="border-b border-outline-variant/10 pb-4 last:border-0 last:pb-0">
                    <h4 className="font-semibold text-[15px] mb-2 text-primary">{item.q}</h4>
                    <p className="text-[13px] text-on-surface-variant leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Support Ticket Form */}
          <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
            <h3 className="font-bold text-[18px] mb-4">Submit a Ticket</h3>
            {ticketSubmitted ? (
              <div className="p-8 bg-secondary/10 rounded-xl border border-secondary/20 text-center space-y-2">
                <span className="material-symbols-outlined text-secondary text-5xl">check_circle</span>
                <p className="text-xl font-semibold text-primary">Ticket Submitted!</p>
                <p className="text-[13px] text-on-surface-variant">Our support team will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant">Subject</label>
                  <input required placeholder="e.g. ERP Sync Error" className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant">Priority</label>
                  <select className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary transition-all appearance-none">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant">Description</label>
                  <textarea required rows={4} placeholder="Please provide details of your issue..." className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary transition-all resize-none" />
                </div>
                <button disabled={ticketSubmitting} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-[13px] hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  {ticketSubmitting ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : "Submit Ticket"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
