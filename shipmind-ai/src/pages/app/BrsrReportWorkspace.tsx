import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  SlidersHorizontal,
  Search,
  ChevronDown,
  Eye,
  Download,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { apiGet, apiPost, apiDownloadBlob } from '../../lib/api-client';
import SideNav from '../../components/layout/SideNav';
import ComplianceHeader from '../../components/layout/ComplianceHeader';

interface BrsrReportItem {
  id: string;
  financialYear: string;
  boundary: string;
  version: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'READY_FOR_GENERATION' | 'FINALIZED' | 'ARCHIVED';
  completenessScore: number;
  isAssured: boolean;
  assuranceProvider?: string;
  createdAt: string;
  updatedAt: string;
  sectionAData?: any;
}

export default function BrsrReportWorkspace() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<BrsrReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFyFilter, setSelectedFyFilter] = useState('FY 2025-26');
  const [boundaryFilter, setBoundaryFilter] = useState<'ALL' | 'STANDALONE' | 'CONSOLIDATED'>('ALL');

  // New Draft Modal State
  const [newFy, setNewFy] = useState('FY 2025-26');
  const [newBoundary, setNewBoundary] = useState<'STANDALONE' | 'CONSOLIDATED'>('STANDALONE');

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const data = await apiGet<BrsrReportItem[]>('/api/v1/brsr/reports');
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load BRSR reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreateDraft = async () => {
    try {
      setIsCreating(true);
      const res = await apiPost<{ id: string }>('/api/v1/brsr/reports', {
        financialYear: newFy,
        boundary: newBoundary,
      });
      setShowNewModal(false);
      navigate(`/app/reports/brsr/${res.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to initialize BRSR report');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (report: BrsrReportItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(report.id);
      const safeFy = (report.financialYear || 'FY_2025-26').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `BRSR_Report_${safeFy}_v${report.version || 1}.pdf`;
      await apiDownloadBlob(`/api/v1/brsr/reports/${report.id}/download`, filename);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF report. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const companyName = r.sectionAData?.entityDetails?.name || 'Acme Corp Global';
      const matchesSearch =
        companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.financialYear.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.boundary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBoundary =
        boundaryFilter === 'ALL' || r.boundary.toUpperCase() === boundaryFilter;
      return matchesSearch && matchesBoundary;
    });
  }, [reports, searchQuery, boundaryFilter]);

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffHrs = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      if (diffHrs < 1) return 'Updated just now';
      if (diffHrs < 24) return `Updated ${diffHrs} hrs ago`;
      return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } catch {
      return 'Recently updated';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
      <SideNav />

      <div className="pl-64 flex-1 flex flex-col min-w-0">
        <ComplianceHeader onSync={fetchReports} isSyncing={isLoading} />

        <main className="pt-20 px-8 lg:px-12 py-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header & Main Actions */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-1">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                BRSR Reports
              </h1>
              <p className="text-sm font-semibold text-[#0F6B3A] mt-1">
                Business Responsibility & Sustainability Reporting
              </p>
              <p className="text-[13px] text-slate-500 mt-1 max-w-2xl">
                Create, review and finalize audit-ready BRSR disclosures from verified CarbonIQ data.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
                  const dlAnchorElem = document.createElement('a');
                  dlAnchorElem.setAttribute("href", dataStr);
                  dlAnchorElem.setAttribute("download", "BRSR_Reports_List.json");
                  dlAnchorElem.click();
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                Export List
              </button>

              <button
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Create BRSR Report
              </button>
            </div>
          </div>

          {/* Search, Filter & Boundary Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-transparent placeholder-slate-400 outline-none"
              />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => alert("Filter presets: Standalone entities, Consolidated groups, Verified audit ledger.")}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Filters
              </button>

              <div className="relative">
                <select
                  value={selectedFyFilter}
                  onChange={(e) => setSelectedFyFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg outline-none cursor-pointer"
                >
                  <option value="FY 2025-26">FY 2025-26</option>
                  <option value="FY 2024-25">FY 2024-25</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="h-4 w-[1px] bg-slate-200 hidden md:block mx-1" />

              {/* Segmented Boundary Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
                <button
                  onClick={() => setBoundaryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    boundaryFilter === 'ALL'
                      ? 'bg-white text-slate-900 font-bold shadow-sm'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setBoundaryFilter('STANDALONE')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    boundaryFilter === 'STANDALONE'
                      ? 'bg-white text-slate-900 font-bold shadow-sm'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Standalone
                </button>
                <button
                  onClick={() => setBoundaryFilter('CONSOLIDATED')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    boundaryFilter === 'CONSOLIDATED'
                      ? 'bg-white text-slate-900 font-bold shadow-sm'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Consolidated
                </button>
              </div>
            </div>
          </div>

          {/* Reports Card List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                Loading compliance reports...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3A] mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No BRSR Reports Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Start your statutory Business Responsibility & Sustainability Reporting for FY 2025-26.
                </p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="px-4 py-2 bg-[#0F6B3A] hover:bg-[#125C3A] text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  + Create First Report
                </button>
              </div>
            ) : (
              filteredReports.map((report) => {
                const companyName = report.sectionAData?.entityDetails?.name || 'Acme Corp Global';
                const isDown = downloadingId === report.id;
                const boundaryText = report.boundary === 'CONSOLIDATED' ? 'Consolidated' : 'Standalone';

                return (
                  <div
                    key={report.id}
                    onClick={() => navigate(`/app/reports/brsr/${report.id}`)}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  >
                    {/* Left: Document Icon & Details */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] border border-emerald-100 flex items-center justify-center text-[#0F6B3A] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {companyName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            v{report.version || 1}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 font-medium">
                          BRSR Report {report.financialYear}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {boundaryText} • {formatRelativeTime(report.updatedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Completeness Meter */}
                    <div className="w-48 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Completeness</span>
                        <span className="font-bold text-slate-900">{report.completenessScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0F6B3A] rounded-full transition-all duration-300"
                          style={{ width: `${report.completenessScore}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#0F6B3A] font-semibold pt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ledger Connected</span>
                      </div>
                    </div>

                    {/* Right: Status & Actions */}
                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Status Badge */}
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F4EA] text-[#146C43] flex items-center gap-1.5 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#146C43]" />
                        In Review
                      </span>

                      {/* Preview Button */}
                      <button
                        onClick={() => navigate(`/app/reports/brsr/${report.id}/preview`)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                        title="Preview Report"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={(e) => handleDownload(report, e)}
                        disabled={isDown}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Download Statutory PDF"
                      >
                        <Download className={`w-4 h-4 ${isDown ? 'animate-bounce text-[#0F6B3A]' : ''}`} />
                      </button>

                      {/* Open Builder Button */}
                      <button
                        onClick={() => navigate(`/app/reports/brsr/${report.id}`)}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        Open Builder
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Modal: Create BRSR Report */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in zoom-in-95">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F6B3A] bg-[#E6F4EA] px-2 py-0.5 rounded border border-emerald-200">
                Statutory Disclosure
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">Initialize BRSR Draft</h3>
              <p className="text-xs text-slate-500 mt-1">
                CarbonIQ will automatically aggregate verified Scope 1, 2, 3 and energy metrics from your transactional database.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">Reporting Financial Year</label>
                <select
                  value={newFy}
                  onChange={(e) => setNewFy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-[#0F6B3A]"
                >
                  <option value="FY 2025-26">FY 2025-26 (April 1, 2025 – March 31, 2026)</option>
                  <option value="FY 2024-25">FY 2024-25 (April 1, 2024 – March 31, 2025)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1.5">Reporting Boundary</label>
                <select
                  value={newBoundary}
                  onChange={(e) => setNewBoundary(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-[#0F6B3A]"
                >
                  <option value="STANDALONE">Standalone Entity Only</option>
                  <option value="CONSOLIDATED">Consolidated (Group + Subsidiaries)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDraft}
                disabled={isCreating}
                className="px-5 py-2 rounded-xl bg-[#0F6B3A] hover:bg-[#125C3A] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {isCreating ? 'Aggregating...' : 'Create & Open Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
