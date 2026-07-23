import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { apiGet, apiPost } from "../../lib/api-client";

interface ReviewItem {
  id: string; // documentId
  organizationId: string;
  siteName: string;
  reportingPeriodName: string;
  categoryName: string;
  categoryCode: string;
  fileName: string;
  source: string;
  status: string;
  hasHardBlock: boolean;
  totalFlagsCount: number;
  flags: Array<{
    code: string;
    field?: string;
    message: string;
    severity: "HARD_BLOCK" | "WARNING" | "INFO";
    layer: string;
  }>;
  createdAt: string;
}

export default function AIReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ items: ReviewItem[]; total: number }>("/api/v1/review-queue");
      setItems(data.items || []);
      if (data.items.length > 0 && !selectedId) {
        setSelectedId(data.items[0].id);
      }
    } catch (err: any) {
      console.warn("Using sample queue data if backend server is offline:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (docId: string) => {
    setActionLoading(true);
    setMsg("");
    try {
      await apiPost(`/api/v1/documents/${docId}/approve`, { reason: "Approved via Human Review UI" });
      setMsg("Document approved and enqueued for carbon calculation!");
      await fetchQueue();
    } catch (err: any) {
      setMsg(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (docId: string) => {
    if (!rejectReason || rejectReason.length < 10) {
      setMsg("Rejection reason must be at least 10 characters long.");
      return;
    }
    setActionLoading(true);
    setMsg("");
    try {
      await apiPost(`/api/v1/documents/${docId}/reject`, { reason: rejectReason });
      setMsg("Document rejected successfully.");
      setShowRejectModal(false);
      setRejectReason("");
      await fetchQueue();
    } catch (err: any) {
      setMsg(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    const zeroFlagIds = items.filter((item) => item.totalFlagsCount === 0).map((item) => item.id);
    if (zeroFlagIds.length === 0) {
      setMsg("No zero-flag records available in queue for bulk approval.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiPost<{ approvedCount: number }>("/api/v1/review-queue/bulk-approve", {
        documentIds: zeroFlagIds,
      });
      setMsg(`Bulk approved ${res.approvedCount} zero-flag records!`);
      await fetchQueue();
    } catch (err: any) {
      setMsg(`Bulk approval failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <AppLayout title="AI Review Queue" subtitle="Flagged for Human Review (Module 7 Connected)">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        {msg && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary font-medium flex justify-between items-center">
            <span>{msg}</span>
            <button onClick={() => setMsg("")} className="text-xs font-bold underline">Dismiss</button>
          </div>
        )}

        {/* Header row */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-[18px] font-bold text-primary">
              {items.length} Documents Pending Review
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBulkApprove}
              disabled={actionLoading || items.length === 0}
              className="bg-secondary text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              Batch Approve Zero-Flag Records
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-on-surface-variant font-medium">
            Loading review queue from Carbon OS API...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-outline-variant/30 space-y-4">
            <span className="material-symbols-outlined text-secondary text-6xl">check_circle</span>
            <p className="text-2xl font-semibold text-primary">Review Queue is Empty</p>
            <p className="text-on-surface-variant text-sm">All uploaded activity documents have been approved or validated!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Queue List */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-5 rounded-[16px] border transition-all ${
                    selectedId === item.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-outline-variant/30 bg-white hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-[15px] truncate">{item.fileName}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.hasHardBlock ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {item.hasHardBlock ? "HARD BLOCK" : `${item.totalFlagsCount} Flags`}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-1">{item.siteName} • {item.categoryName}</p>
                  <span className="text-[11px] text-primary font-medium">Status: {item.status}</span>
                </button>
              ))}
            </div>

            {/* Document Detail Panel */}
            {selectedItem && (
              <div className="lg:col-span-3 bg-white border border-outline-variant/30 rounded-[24px] p-8 space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-primary">{selectedItem.fileName}</h2>
                    <p className="text-xs text-on-surface-variant">{selectedItem.siteName} | {selectedItem.reportingPeriodName}</p>
                  </div>
                  <span className="px-3 py-1 bg-surface-container rounded-lg text-xs font-bold">{selectedItem.categoryCode}</span>
                </div>

                {/* Flags Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Validation Flags ({selectedItem.flags.length})</h3>
                  {selectedItem.flags.length === 0 ? (
                    <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      ✓ Zero validation flags raised. Ready for instant approval.
                    </p>
                  ) : (
                    selectedItem.flags.map((flag, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border text-xs space-y-1 ${
                        flag.severity === "HARD_BLOCK" ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}>
                        <div className="font-bold flex justify-between">
                          <span>[{flag.layer}] {flag.code}</span>
                          <span className="uppercase font-extrabold">{flag.severity}</span>
                        </div>
                        <p>{flag.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(selectedItem.id)}
                    disabled={actionLoading || selectedItem.hasHardBlock}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40"
                  >
                    Approve Record
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all disabled:opacity-40"
                  >
                    Reject Record
                  </button>
                </div>

                {/* Reject Reason Modal */}
                {showRejectModal && (
                  <div className="p-4 bg-gray-50 border rounded-xl space-y-3">
                    <label className="text-xs font-bold text-primary">Reason for Rejection (min 10 characters)</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Unreadable blurred scan, wrong vendor invoice"
                      className="w-full p-3 border rounded-xl text-xs"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowRejectModal(false)} className="px-3 py-1 text-xs border rounded-lg">Cancel</button>
                      <button onClick={() => handleReject(selectedItem.id)} className="px-3 py-1 text-xs bg-red-600 text-white font-bold rounded-lg">Confirm Reject</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
