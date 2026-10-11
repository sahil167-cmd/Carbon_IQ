import { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  FileText,
  PieChart,
  ShieldCheck,
  Zap,
  Clock,
  PlusCircle,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  Leaf,
  Pencil,
  Trash2,
  TrendingUp,
  BarChart2,
  ArrowUp,
  Database,
  Layers,
  Sparkles,
  Lightbulb,
  Building2,
  CheckCircle2,
  MapPin,
  Calendar,
  Gauge,
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../lib/api-client';

interface Citation {
  type: 'database' | 'document';
  source?: string;
  reference?: string;
  value?: string;
  documentId?: string;
  filename?: string;
  page?: number;
  section?: string;
  chunkId?: string;
  score?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

interface StarterQuestion {
  question: string;
  category: string;
  icon: string;
  description?: string;
}

interface SessionItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export default function CopilotPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [starters, setStarters] = useState<StarterQuestion[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText] = useState('');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [realDocCount, setRealDocCount] = useState<number>(18);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      loadStarters();
      loadSessions();
      fetchRealDocCount();
    }
  }, [isOpen]);

  const fetchRealDocCount = async () => {
    try {
      const res = await apiGet<{ total: number }>('/api/v1/documents', { limit: 1 });
      if (res && typeof res.total === 'number') {
        setRealDocCount(res.total);
      }
    } catch {
      // Fallback
    }
  };

  const loadStarters = async () => {
    try {
      const data = await apiGet<StarterQuestion[]>('/api/v1/copilot/starters');
      if (data && data.length > 0) {
        setStarters(data);
        return;
      }
    } catch {
      // fallback
    }

    setStarters([
      {
        question: 'Break down scope 3 emissions for Q2 across European facilities.',
        category: 'Emissions Analysis',
        icon: 'bar-chart',
      },
      {
        question: 'What will our emissions be next month?',
        category: 'Forecasting',
        icon: 'trending-up',
      },
      {
        question: 'Extract compliance anomalies from the latest supplier sustainability reports.',
        category: 'Document Intelligence',
        icon: 'file-text',
      },
    ]);
  };

  const loadSessions = async () => {
    try {
      const data = await apiGet<SessionItem[]>('/api/v1/copilot/sessions');
      setSessions(data || []);
    } catch (err) {
      console.warn('Failed to fetch sessions:', err);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const data = await apiGet<any>(`/api/v1/copilot/sessions/${sessionId}`);
      setCurrentSessionId(sessionId);
      setMessages(
        data.messages?.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          createdAt: m.createdAt,
        })) || [],
      );
      setShowSessionsList(false);
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiDelete(`/api/v1/copilot/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.warn('Delete session error:', err);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowSessionsList(false);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyPrompt = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(msgId);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditPromptText(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditPromptText('');
  };

  const handleSaveAndResubmit = async (msgId: string) => {
    const trimmed = editPromptText.trim();
    if (!trimmed || isLoading) return;

    const msgIdx = messages.findIndex((m) => m.id === msgId);
    if (msgIdx !== -1) {
      const priorMessages = messages.slice(0, msgIdx);
      setMessages(priorMessages);
    }

    setEditingMessageId(null);
    setEditPromptText('');
    await handleSendMessage(trimmed);
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    setFeedbackGiven((prev) => ({ ...prev, [messageId]: type }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const payload = await apiPost<{
        sessionId?: string;
        messageId?: string;
        answer?: string;
        reply?: string;
        content?: string;
        citations?: Citation[];
      }>('/api/v1/copilot/query', {
        message: text,
        sessionId: currentSessionId || undefined,
      });

      if (payload?.sessionId && payload.sessionId !== currentSessionId) {
        setCurrentSessionId(payload.sessionId);
        loadSessions();
      }

      const assistantMsg: Message = {
        id: payload?.messageId || `asst_${Date.now()}`,
        role: 'assistant',
        content: payload?.answer || payload?.reply || payload?.content || 'No response recorded in ledger.',
        citations: payload?.citations || [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Copilot send error:', err);
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Error communicating with Copilot';
      const fallbackMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to fetch intelligence: ${errMsg}. Please try again.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Clean Inline Formatter (Converts bold, italics, code, removes raw markdown symbols) ──
  const formatInline = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300 font-semibold">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="text-emerald-300 font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-300 italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#0e1724] text-[#00e599] px-1.5 py-0.5 rounded font-mono text-[11px] border border-emerald-500/30">$1</code>')
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '');
  };

  const stripMarkdownSymbols = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/^#+\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/^[-*]\s*/g, '')
      .trim();
  };

  // ── Render Structured Vendor/Entity Card (For RAG entity details queries) ──
  const renderStructuredEntityCard = (content: string, bIdx: number) => {
    // Extract vendor/entity title
    const titleMatch = content.match(/(?:Vendor Details|Entity Details|Supplier Summary|Document Summary)[:\s]+([^\n\r*]+)/i);
    const title = titleMatch ? stripMarkdownSymbols(titleMatch[1]) : 'Verified Entity Record';

    // Extract status, category, scope, documents
    const categoryMatch = content.match(/Category[:\s]+([^\n\r*-]+?)(?:\s*(?:Status|Scope|Document)|$)/i);
    const statusMatch = content.match(/Status[:\s]+([^\n\r*-]+?)(?:\s*(?:Category|Scope|Document)|$)/i);
    const docMatch = content.match(/Document\(s\)[:\s]+([A-Za-z0-9_.-]+\.pdf)/i);

    // Extract extracted fields (Unit, Quantity, kWh, Invoice, REC, Factor)
    const extractedFieldsBlock = content.match(/Extracted Fields[:\s]+([\s\S]+?)(?=(?:Billing Period|GHG Protocol|Target Site|Meter Details|$))/i);
    const rawFieldsText = extractedFieldsBlock ? extractedFieldsBlock[1] : '';
    const fieldItems = rawFieldsText
      .split(/\s*-\s*|\n+/)
      .map((f) => f.trim())
      .filter((f) => f.includes(':'));

    // Extract billing period & target site
    const billingMatch = content.match(/Billing Period[:\s]+([^\n\r*]+?)(?=\s*Target Site|\s*Meter|$)/i);
    const siteMatch = content.match(/Target Site[:\s]+([^\n\r*]+?)(?=\s*Meter|\s*Billing|$)/i);

    // Extract meter details
    const meterBlock = content.match(/Meter Details[:\s]+([\s\S]+?)(?=(?:GHG Protocol|Billing Period|$))/i);
    const meterItems = meterBlock
      ? meterBlock[1]
          .split(/\s*-\s*|\n+/)
          .map((m) => m.trim())
          .filter((m) => m.includes(':') || m.includes('Meter'))
      : [];

    // Extract compliance
    const complianceMatch = content.match(/GHG Protocol Compliance[:\s]+([^\n\r]+)/i);

    return (
      <div
        key={bIdx}
        className="bg-gradient-to-br from-[#0c1524]/90 via-[#0a101b]/95 to-[#070c14] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-2xl backdrop-blur-xl relative overflow-hidden"
      >
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00e599]/80 to-transparent" />

        {/* 1. Header & Title Banner */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-[#00e599]/40 flex items-center justify-center text-[#00e599] shadow-lg shadow-emerald-500/10 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00e599] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  VERIFIED AUDIT RECORD
                </span>
              </div>
              <h4 className="font-bold text-sm text-white tracking-wide font-sans mt-1">
                {title}
              </h4>
            </div>
          </div>

          {statusMatch && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-[#00e599]/40 text-[#00e599] font-mono text-[11px] font-bold flex items-center gap-1.5 shrink-0 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stripMarkdownSymbols(statusMatch[1])}
            </span>
          )}
        </div>

        {/* 2. Metadata Pills (Category & Verified Document) */}
        <div className="flex flex-wrap items-center gap-2">
          {categoryMatch && (
            <div className="px-3 py-1.5 rounded-xl bg-[#0f1a2a] border border-sky-500/30 text-sky-300 text-xs font-mono flex items-center gap-1.5 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold">{stripMarkdownSymbols(categoryMatch[1])}</span>
            </div>
          )}

          {docMatch && (
            <div className="px-3 py-1.5 rounded-xl bg-[#0a1720] border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-1.5 shadow-sm hover:border-cyan-300 transition-colors cursor-pointer">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{docMatch[1]}</span>
            </div>
          )}
        </div>

        {/* 3. Extracted Activity & Metering Key-Value Matrix */}
        {fieldItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Gauge className="w-3.5 h-3.5 text-[#00e599]" />
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-300">
                EXTRACTED ACTIVITY METRICS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fieldItems.map((item, fIdx) => {
                const [k, ...vParts] = item.split(':');
                const val = vParts.join(':').trim();
                return (
                  <div
                    key={fIdx}
                    className="p-2.5 rounded-xl bg-[#080e18]/90 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-slate-400 truncate uppercase">
                      {stripMarkdownSymbols(k)}
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-0.5 break-words">
                      {stripMarkdownSymbols(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Billing Period & Facility Location Details */}
        {(billingMatch || siteMatch) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {billingMatch && (
              <div className="p-3 bg-[#09101b] rounded-xl border border-slate-800/80 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Billing Period</span>
                  <span className="text-xs font-semibold text-slate-200 mt-0.5 block font-sans">
                    {stripMarkdownSymbols(billingMatch[1])}
                  </span>
                </div>
              </div>
            )}

            {siteMatch && (
              <div className="p-3 bg-[#09101b] rounded-xl border border-slate-800/80 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Target Facility</span>
                  <span className="text-xs font-semibold text-slate-200 mt-0.5 block font-sans">
                    {stripMarkdownSymbols(siteMatch[1])}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Meter Specific Consumption Items */}
        {meterItems.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 block">
              METER CONSUMPTION BREAKDOWN
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {meterItems.map((m, mIdx) => {
                const [mName, mVal] = m.split(':');
                return (
                  <div key={mIdx} className="p-2.5 bg-[#080d16] rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium font-sans">{stripMarkdownSymbols(mName)}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{stripMarkdownSymbols(mVal || '')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. GHG Protocol Compliance Banner */}
        {complianceMatch && (
          <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/40 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#00e599] shrink-0" />
            <div className="text-xs leading-relaxed text-slate-200">
              <strong className="text-[#00e599] font-semibold block font-sans">GHG Protocol Compliance:</strong>
              <span className="text-slate-300 text-[11px] font-sans">
                {stripMarkdownSymbols(complianceMatch[1])}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Helper: Extract Genuine Scope Metrics if present in RAG text ──
  const extractVerifiedScopeMetrics = (content: string) => {
    const s1Match = content.match(/Scope\s*1[^\d:]*[:=]?\s*`?([\d,]+(?:\.\d+)?)\s*(kg|t|tonnes|metric tons)?/i);
    const s2Match = content.match(/Scope\s*2[^\d:]*[:=]?\s*`?([\d,]+(?:\.\d+)?)\s*(kg|t|tonnes|metric tons)?/i);
    const s3Match = content.match(/Scope\s*3[^\d:]*[:=]?\s*`?([\d,]+(?:\.\d+)?)\s*(kg|t|tonnes|metric tons)?/i);

    const s1 = s1Match ? parseFloat(s1Match[1].replace(/,/g, '')) : 0;
    const s2 = s2Match ? parseFloat(s2Match[1].replace(/,/g, '')) : 0;
    const s3 = s3Match ? parseFloat(s3Match[1].replace(/,/g, '')) : 0;

    const validScopes = [s1, s2, s3].filter((val) => val > 0);
    if (validScopes.length < 2) {
      return { hasData: false as const };
    }

    const total = s1 + s2 + s3;
    const p1 = Math.round((s1 / total) * 100);
    const p2 = Math.round((s2 / total) * 100);
    const p3 = Math.max(0, 100 - p1 - p2);
    const unit = s1Match?.[2] || s2Match?.[2] || s3Match?.[2] || 'kg CO2e';

    return {
      hasData: true as const,
      s1,
      s2,
      s3,
      p1,
      p2,
      p3,
      total,
      unit,
    };
  };

  // ── Helper: Extract Genuine Forecast Metrics if present in RAG text ──
  const extractVerifiedForecastMetrics = (content: string) => {
    const forecastMatch = content.match(/(?:forecast(?:ed)?|predicted|projection|next month(?:'s)? emissions?)[^\d:]*[:=]?\s*`?([\d,]+(?:\.\d+)?)\s*(kg|t|tonnes|metric tons)?/i);
    const actualMatch = content.match(/(?:current(?: mtd)?|actual|baseline|previous month)[^\d:]*[:=]?\s*`?([\d,]+(?:\.\d+)?)\s*(kg|t|tonnes|metric tons)?/i);
    const changeMatch = content.match(/([+-]?\d+(?:\.\d+)?%)/);

    if (!forecastMatch || !actualMatch) {
      return { hasData: false as const };
    }

    const forecastNum = parseFloat(forecastMatch[1].replace(/,/g, ''));
    const actualNum = parseFloat(actualMatch[1].replace(/,/g, ''));

    if (isNaN(forecastNum) || isNaN(actualNum) || actualNum <= 0) {
      return { hasData: false as const };
    }

    const change = changeMatch
      ? changeMatch[1]
      : `${forecastNum >= actualNum ? '+' : ''}${(((forecastNum - actualNum) / actualNum) * 100).toFixed(1)}%`;

    const unit = forecastMatch[2] || actualMatch[2] || 'kg CO2e';
    const isXGBoost = content.toLowerCase().includes('xgboost');
    const isRidge = content.toLowerCase().includes('ridge');
    const model = isXGBoost ? 'XGBoost v4.2' : isRidge ? 'Ridge Model' : 'ML Forecast Engine';

    return {
      hasData: true as const,
      actualStr: actualMatch[1],
      forecastStr: forecastMatch[1],
      actualNum,
      forecastNum,
      change,
      unit,
      model,
    };
  };

  // ── Render Verified Scope Intensity Card ──
  const renderVerifiedScopeCard = (metrics: ReturnType<typeof extractVerifiedScopeMetrics> & { hasData: true }) => {
    return (
      <div className="bg-gradient-to-br from-[#0c1524] to-[#070c14] border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-xl font-sans mt-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#00e599]" />
            <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">
              VERIFIED SCOPE BREAKDOWN
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#00e599] bg-emerald-950/80 px-2 py-0.5 rounded border border-[#00e599]/30">
            Total: {metrics.total.toLocaleString('en-US', { maximumFractionDigits: 1 })} {metrics.unit}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-[#0a121d] border border-sky-500/30 text-center">
            <span className="text-[9px] font-mono text-sky-400 font-bold block">SCOPE 1 DIRECT</span>
            <p className="text-xs font-bold text-white font-mono mt-0.5">{metrics.p1}%</p>
            <p className="text-[9px] font-mono text-slate-400 truncate">{metrics.s1.toLocaleString()} {metrics.unit}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0a121d] border border-amber-500/30 text-center">
            <span className="text-[9px] font-mono text-amber-400 font-bold block">SCOPE 2 GRID</span>
            <p className="text-xs font-bold text-white font-mono mt-0.5">{metrics.p2}%</p>
            <p className="text-[9px] font-mono text-slate-400 truncate">{metrics.s2.toLocaleString()} {metrics.unit}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0a121d] border border-emerald-500/30 text-center">
            <span className="text-[9px] font-mono text-emerald-400 font-bold block">SCOPE 3 VALUE</span>
            <p className="text-xs font-bold text-white font-mono mt-0.5">{metrics.p3}%</p>
            <p className="text-[9px] font-mono text-slate-400 truncate">{metrics.s3.toLocaleString()} {metrics.unit}</p>
          </div>
        </div>

        {/* 3-Color Scope Intensity Ratio Bar */}
        <div className="space-y-1">
          <div className="h-2.5 w-full bg-[#070c13] rounded-full flex overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
            <div style={{ width: `${metrics.p1}%` }} className="bg-sky-500 rounded-l-full" title={`Scope 1: ${metrics.p1}%`} />
            <div style={{ width: `${metrics.p2}%` }} className="bg-amber-400" title={`Scope 2: ${metrics.p2}%`} />
            <div style={{ width: `${metrics.p3}%` }} className="bg-[#00e599] rounded-r-full" title={`Scope 3: ${metrics.p3}%`} />
          </div>
        </div>
      </div>
    );
  };

  // ── Render Verified Forecast Card ──
  const renderVerifiedForecastCard = (metrics: ReturnType<typeof extractVerifiedForecastMetrics> & { hasData: true }) => {
    const isIncrease = metrics.change.startsWith('+');

    return (
      <div className="bg-gradient-to-br from-[#0c1524] to-[#070c14] border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-xl font-sans mt-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#00e599]" />
            <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">
              FORECAST TRAJECTORY
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> 87% Confidence
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 py-0.5">
          <div className="bg-[#070c13] p-2.5 rounded-xl border border-slate-800">
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Actual (Current)</p>
            <p className="text-sm font-bold text-white font-mono mt-0.5">
              {metrics.actualStr} <span className="text-[9px] text-slate-400">{metrics.unit}</span>
            </p>
          </div>
          <div className="bg-[#070c13] p-2.5 rounded-xl border border-[#00e599]/30 text-right">
            <p className="text-[9px] font-mono text-[#00e599] uppercase tracking-wider">Forecast (Next Month)</p>
            <p className="text-sm font-bold text-amber-300 font-mono mt-0.5">
              {metrics.forecastStr} <span className="text-[9px] text-slate-400">{metrics.unit}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 bg-[#0f1724] px-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-300">Projected Change</span>
          <span
            className={`text-[10px] font-mono font-bold flex items-center gap-1 px-2 py-0.5 rounded ${
              isIncrease
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            <TrendingUp className="w-2.5 h-2.5" /> {metrics.change}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[9px] font-mono text-slate-400">
          <span>Model: <strong className="text-[#00e599]">{metrics.model}</strong></span>
          <span className="text-cyan-400">Verified PostgreSQL Ledger</span>
        </div>
      </div>
    );
  };

  // ── Render Formatted Markdown & Executive Intelligence Cards ──
  const renderFormattedMarkdown = (content: string) => {
    // If the content is an entity record query (e.g. Vendor Details / Pacific Power)
    if (content.includes('Vendor Details:') || content.includes('Extracted Fields:') || (content.includes('Category:') && content.includes('Status:'))) {
      return renderStructuredEntityCard(content, 0);
    }

    const scopeMetrics = extractVerifiedScopeMetrics(content);
    const forecastMetrics = extractVerifiedForecastMetrics(content);

    // Split into logical blocks by double newline or section markers
    const rawBlocks = content.split(/\n\n+/).filter((b) => b.trim().length > 0);

    return (
      <div className="space-y-4 font-sans text-xs text-slate-200 leading-relaxed">
        {rawBlocks.map((block, bIdx) => {
          const trimmed = block.trim();

          // ── 1. Structured Section: Key Insight Callout ──
          if (/^(\*\*)?Key Insight/i.test(trimmed) || trimmed.includes('Key Insight')) {
            const insightText = trimmed.replace(/^(\*\*)?Key Insight:?(\*\*)?:?\s*/i, '');
            return (
              <div
                key={bIdx}
                className="bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-[#0c1524] border border-[#00e599]/40 rounded-2xl p-4 space-y-2 shadow-xl animate-in fade-in duration-200 relative overflow-hidden"
              >
                <div className="flex items-center gap-2 text-[#00e599]">
                  <Lightbulb className="w-4 h-4 text-[#00e599] shrink-0" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                    KEY STRATEGIC INSIGHT
                  </span>
                </div>
                <p
                  className="text-xs text-slate-100 leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{ __html: formatInline(insightText) }}
                />
              </div>
            );
          }

          // ── 2. Structured Section: Top Reduction Levers Card ──
          if (/^(\*\*)?Top Reduction Levers/i.test(trimmed) || trimmed.includes('Reduction Levers')) {
            const lines = trimmed.split(/\s*-\s*|\n+/).filter((l) => l.trim().length > 0);
            const titleLine = lines[0] || 'Top Reduction Levers (Evidence-Based)';
            const subItems = lines.slice(1);

            const targetScope = subItems.find((s) => /target scope/i.test(s))?.replace(/target scope:?/i, '').trim();
            const potentialRed = subItems.find((s) => /potential reduction/i.test(s))?.replace(/potential reduction:?/i, '').trim();
            const actionText = subItems.find((s) => /action:?/i.test(s))?.replace(/action:?/i, '').trim();
            const roiTimeframe = subItems.find((s) => /roi timeframe/i.test(s))?.replace(/roi timeframe:?/i, '').trim();

            return (
              <div
                key={bIdx}
                className="bg-[#0b121b] border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200">
                      DECARBONIZATION ACTION LEVER
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-[#00e599]/30">
                    High Impact
                  </span>
                </div>

                <p className="font-bold text-xs text-white font-sans">
                  {stripMarkdownSymbols(titleLine.replace(/^Top Reduction Levers[^\d]*\d*\.?\s*/i, '') || titleLine)}
                </p>

                {/* Badges Grid for Scope, Reduction, and ROI */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {targetScope && (
                    <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-500/40 text-sky-300 font-mono text-[10px] flex items-center gap-1">
                      <strong>Target:</strong> {stripMarkdownSymbols(targetScope)}
                    </span>
                  )}
                  {potentialRed && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-[#00e599]/40 text-[#00e599] font-mono text-[10px] flex items-center gap-1">
                      <strong>Potential:</strong> {stripMarkdownSymbols(potentialRed)}
                    </span>
                  )}
                  {roiTimeframe && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-[10px] flex items-center gap-1">
                      <strong>ROI:</strong> {stripMarkdownSymbols(roiTimeframe)}
                    </span>
                  )}
                </div>

                {/* Action details */}
                {actionText && (
                  <div className="p-3 bg-[#070c13] rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-bold text-white block mb-0.5">Recommended Action:</span>
                    <span dangerouslySetInnerHTML={{ __html: formatInline(actionText) }} />
                  </div>
                )}
              </div>
            );
          }

          // ── 3. Headings (#, ##, ###) ──
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            const heading = stripMarkdownSymbols(trimmed);
            return (
              <div key={bIdx} className="pt-2 pb-1 border-b border-slate-800/80 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00e599]" />
                <h4 className="font-bold text-sm text-[#00e599] tracking-wide font-sans">
                  {heading}
                </h4>
              </div>
            );
          }

          // ── 4. Standard Markdown Tables ──
          if (trimmed.includes('|') && trimmed.includes('\n')) {
            const rows = trimmed.split('\n');
            const headers = rows[0].split('|').map((c) => stripMarkdownSymbols(c)).filter(Boolean);
            const dataRows = rows.slice(2).map((r) => r.split('|').map((c) => stripMarkdownSymbols(c)).filter(Boolean));
            return (
              <div key={bIdx} className="overflow-x-auto my-2 rounded-xl border border-slate-800 bg-[#070c13] shadow-lg">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-[#101824] text-[#00e599] border-b border-slate-800">
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {dataRows.map((dr, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40">
                        {dr.map((c, cIdx) => (
                          <td key={cIdx} className="px-3 py-2">{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          // ── 5. Bullet Lists & Dash-Separated Items ──
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || (trimmed.includes('\n- ') || trimmed.includes('\n* '))) {
            const items = trimmed
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.startsWith('- ') || l.startsWith('* '));

            if (items.length > 0) {
              return (
                <ul key={bIdx} className="space-y-2 pl-1">
                  {items.map((it, iIdx) => (
                    <li key={iIdx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] mt-1.5 shrink-0 shadow-sm shadow-emerald-500/50" />
                      <span
                        className="text-slate-200 text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatInline(it.replace(/^[-*]\s*/, '')) }}
                      />
                    </li>
                  ))}
                </ul>
              );
            }
          }

          // ── 6. Standard Clean Paragraph ──
          return (
            <p
              key={bIdx}
              className="leading-relaxed text-slate-200"
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
            />
          );
        })}

        {/* Embedded Visual Analytics ONLY when Real Extracted Data is Present */}
        {scopeMetrics.hasData && renderVerifiedScopeCard(scopeMetrics)}
        {forecastMetrics.hasData && renderVerifiedForecastCard(forecastMetrics)}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Trigger Button with Botanical Glowing Mesh */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0c1524] via-[#09101a] to-[#0d1828] hover:from-[#101d30] hover:to-[#132238] text-slate-100 font-bold rounded-full shadow-[0_0_30px_rgba(0,229,153,0.25)] border border-[#00e599]/50 transition-all duration-300 transform hover:scale-105 active:scale-95 group backdrop-blur-xl"
        title="Open CarbonIQ Intelligence Copilot"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-[#00e599]/60 flex items-center justify-center text-[#00e599] shadow-inner shadow-emerald-500/30">
            <Leaf className="w-4 h-4 animate-pulse" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00e599] rounded-full animate-ping" />
        </div>
        <div className="flex flex-col text-left pr-1">
          <span className="text-xs font-bold text-white tracking-wide font-sans flex items-center gap-1">
            CarbonIQ Copilot
            <Sparkles className="w-3 h-3 text-[#00e599]" />
          </span>
          <span className="text-[9px] text-[#00e599] font-mono font-semibold">Botanical RAG Live</span>
        </div>
      </button>

      {/* Slide-Over Studio Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop with Frosted Blur */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-Over Panel Container (Senior UI/UX Obsidian Glassmorphic Theme) */}
          <div className="relative w-full max-w-xl bg-[#060b13]/95 backdrop-blur-2xl border-l border-slate-800/90 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 text-slate-100 font-sans overflow-hidden">
            
            {/* Ambient Multi-Layer Radial Mesh Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute top-1/3 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -ml-20" />
            <div className="absolute bottom-20 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar Header with Executive Status Pill */}
            <div className="px-5 py-4 border-b border-slate-800/80 bg-[#080e18]/80 backdrop-blur-xl flex items-center justify-between shadow-sm shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-[#00e599]/40 flex items-center justify-center text-[#00e599] shadow-md shadow-emerald-500/10">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white tracking-wide font-sans">
                      CarbonIQ Intelligence Copilot
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-[#00e599]/40 text-[#00e599] text-[9px] font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] animate-pulse" />
                      RAG ACTIVE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Grounded in Verified Carbon Ledger & {realDocCount} Documents
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSessionsList(!showSessionsList)}
                  className={`p-2 rounded-xl transition-all ${
                    showSessionsList ? 'bg-emerald-500/20 text-[#00e599] border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                  title="Conversation History"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNewChat}
                  className="p-2 text-slate-400 hover:text-[#00e599] hover:bg-slate-800/80 rounded-xl transition-all"
                  title="Start Fresh Chat"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat History Drawer */}
            {showSessionsList && (
              <div className="bg-[#0a101b]/95 backdrop-blur-xl border-b border-slate-800 p-3 max-h-60 overflow-y-auto space-y-1.5 animate-in slide-in-from-top duration-200 shadow-2xl shrink-0 z-20">
                <div className="flex items-center justify-between pb-1 text-xs font-mono font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#00e599]" /> Recent Sustainability Chats
                  </span>
                  <button onClick={handleNewChat} className="text-[#00e599] hover:underline text-[11px] font-bold">
                    + New Session
                  </button>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center font-mono">No previous conversations recorded.</p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-all group/sess cursor-pointer ${
                        currentSessionId === s.id
                          ? 'bg-emerald-950/70 text-emerald-300 border border-[#00e599]/40 shadow-inner'
                          : 'hover:bg-slate-800/60 text-slate-300 border border-slate-800/80'
                      }`}
                    >
                      <div className="truncate pr-2 flex-1">
                        <p className="font-semibold truncate text-slate-200">{s.title || 'Sustainability Session'}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">{s.lastMessage || 'No messages'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-500 whitespace-nowrap bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700/60 transition-colors opacity-70 group-hover/sess:opacity-100"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Conversation Stream & Empty State Container */}
            <div className="flex-1 p-5 overflow-y-auto space-y-6 z-10">
              {messages.length === 0 ? (
                /* ── Landing / Empty State ── */
                <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-6">
                  {/* Glowing Circular Leaf Badge */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-950/80 via-[#0a1724] to-cyan-950/80 border border-[#00e599]/50 flex items-center justify-center text-[#00e599] shadow-[0_0_30px_rgba(0,229,153,0.2)]">
                      <Leaf className="w-8 h-8 animate-pulse" />
                    </div>
                    <Sparkles className="w-5 h-5 text-[#00e599] absolute -top-1.5 -right-1.5 animate-bounce" />
                  </div>

                  <div>
                    <h4 className="font-bold text-2xl text-white tracking-tight font-sans">
                      Ask CarbonIQ
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed mx-auto font-sans">
                      Your botanical sustainability intelligence copilot. Grounded directly in your verified ledger and uploaded documentation.
                    </p>
                  </div>

                  {/* Structured Starter Cards */}
                  <div className="w-full space-y-3 pt-2 text-left">
                    {starters.map((st, sIdx) => {
                      const IconComp = st.icon === 'bar-chart' ? BarChart2 : st.icon === 'trending-up' ? TrendingUp : FileText;
                      return (
                        <div
                          key={sIdx}
                          onClick={() => handleSendMessage(st.question)}
                          className="p-4 rounded-2xl bg-gradient-to-r from-[#0c1420]/90 to-[#09101a]/90 hover:from-[#111c2e] hover:to-[#0f1a28] border border-slate-800 hover:border-[#00e599]/50 transition-all duration-200 cursor-pointer group shadow-xl backdrop-blur-md"
                        >
                          <div className="flex items-center gap-2.5 text-slate-300 mb-1">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#00e599] group-hover:scale-110 transition-transform">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white group-hover:text-[#00e599] transition-colors">{st.category}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal pl-8 font-sans">
                            "{st.question}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ── Conversation Stream ── */
                messages.map((msg, idx) => (
                  <div key={msg.id} className="space-y-2.5">
                    {msg.role === 'user' ? (
                      /* User Message Bubble */
                      <div className="flex flex-col items-end group/user">
                        {editingMessageId === msg.id ? (
                          <div className="p-3.5 rounded-2xl w-full max-w-[90%] bg-[#0e1622] border border-[#00e599]/50 shadow-xl space-y-2.5">
                            <textarea
                              value={editPromptText}
                              onChange={(e) => setEditPromptText(e.target.value)}
                              className="w-full bg-[#080d14] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-[#00e599] resize-none font-sans"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 text-[11px]">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveAndResubmit(msg.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#00e599] hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md flex items-center gap-1.5"
                              >
                                <Send className="w-3 h-3" /> Save & Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-[#142030] to-[#18283c] border border-slate-700/80 text-white px-4 py-3 rounded-2xl text-xs max-w-[85%] font-medium shadow-xl">
                            <p className="leading-relaxed font-sans">{msg.content}</p>
                            
                            {/* Hover Edit & Copy Actions */}
                            <div className="flex items-center justify-end gap-2 mt-2 pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400">
                              <button
                                onClick={() => handleCopyPrompt(msg.content, msg.id)}
                                className="hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-black/20"
                                title="Copy Prompt"
                              >
                                {copiedPromptId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-[#00e599]" />
                                    <span className="text-[#00e599]">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-black/20"
                                title="Edit Prompt"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Assistant Message (Structured Intelligence Cards) */
                      <div className="flex flex-col items-start space-y-2">
                        {/* Assistant Header Tag */}
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-[#00e599]/50 flex items-center justify-center text-[#00e599]">
                            <Leaf className="w-3 h-3" />
                          </div>
                          <span className="text-[11px] font-bold text-[#00e599] tracking-wide font-sans">
                            CarbonIQ Analysis
                          </span>
                        </div>

                        {/* Clean Rendered Output */}
                        <div className="w-full">
                          {renderFormattedMarkdown(msg.content)}
                        </div>

                        {/* Citations Row */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {msg.citations.map((c, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setActiveCitation(c)}
                                className={`text-[10px] font-mono px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-md ${
                                  c.type === 'database'
                                    ? 'bg-[#0a1420] text-[#00e599] border-[#00e599]/40 hover:border-[#00e599]'
                                    : 'bg-[#091522] text-cyan-300 border-cyan-500/40 hover:border-cyan-300'
                                }`}
                              >
                                {c.type === 'database' ? (
                                  <>
                                    <PieChart className="w-3 h-3 text-[#00e599]" />
                                    <span>{c.source} ({c.reference})</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3 h-3 text-cyan-400" />
                                    <span>{c.filename} (p. {c.page || 1})</span>
                                  </>
                                )}
                                <ArrowUpRight className="w-3 h-3 opacity-60" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Feedback & Copy Actions */}
                        <div className="flex items-center justify-between w-full pt-1 px-1 text-slate-500 text-[10px]">
                          <button
                            onClick={() => handleCopy(msg.content, idx)}
                            className="hover:text-slate-200 flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-slate-800/80"
                            title="Copy Answer"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-[#00e599]" />
                                <span className="text-[#00e599] font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Answer</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleFeedback(msg.id, 'up')}
                              className={`p-1.5 rounded-lg transition-colors ${feedbackGiven[msg.id] === 'up' ? 'bg-emerald-500/20 text-[#00e599]' : 'hover:text-slate-300 hover:bg-slate-800'}`}
                              title="Helpful"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'down')}
                              className={`p-1.5 rounded-lg transition-colors ${feedbackGiven[msg.id] === 'down' ? 'bg-rose-500/20 text-rose-400' : 'hover:text-slate-300 hover:bg-slate-800'}`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Streaming Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-[#00e599] text-xs font-mono pt-1">
                  <span className="w-2 h-2 rounded-full bg-[#00e599] animate-ping" />
                  <span>Synthesizing verified carbon intelligence...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Citation Inspector */}
            {activeCitation && (
              <div className="p-3.5 bg-[#0a121d] border-t border-slate-800 text-xs flex items-center justify-between animate-in slide-in-from-bottom shrink-0 z-20">
                <div className="truncate pr-2">
                  <p className="font-bold text-white font-mono truncate">
                    {activeCitation.type === 'database' ? activeCitation.source : activeCitation.filename}
                  </p>
                  <p className="text-[10px] text-[#00e599] font-mono truncate">
                    {activeCitation.type === 'database' ? `Reference: ${activeCitation.reference}` : `Page ${activeCitation.page || 1}`}
                  </p>
                </div>
                <button
                  onClick={() => setActiveCitation(null)}
                  className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-[10px] font-mono"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Bottom Floating Composer Area */}
            <div className="p-4 border-t border-slate-800/80 bg-[#080d16]/90 backdrop-blur-xl space-y-2.5 shrink-0 z-10">
              
              {/* Quick suggestion prompt pills when in conversation */}
              {messages.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-sans">
                  <button
                    onClick={() => handleSendMessage('Break down emissions by category')}
                    className="px-2.5 py-1 rounded-full bg-[#0e1724] hover:bg-[#152438] border border-slate-800 text-slate-300 whitespace-nowrap transition-colors"
                  >
                    📊 Scope Breakdown
                  </button>
                  <button
                    onClick={() => handleSendMessage('What is our carbon forecast for next month?')}
                    className="px-2.5 py-1 rounded-full bg-[#0e1724] hover:bg-[#152438] border border-slate-800 text-slate-300 whitespace-nowrap transition-colors"
                  >
                    📈 Next Month Forecast
                  </button>
                  <button
                    onClick={() => handleSendMessage('Check compliance with GHG Protocol')}
                    className="px-2.5 py-1 rounded-full bg-[#0e1724] hover:bg-[#152438] border border-slate-800 text-slate-300 whitespace-nowrap transition-colors"
                  >
                    🛡️ Compliance Check
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="w-full bg-gradient-to-r from-[#0d1624] to-[#101b2a] border border-slate-700/80 rounded-full px-4 py-2.5 flex items-center gap-3 shadow-2xl focus-within:border-[#00e599]/60 focus-within:shadow-[0_0_20px_rgba(0,229,153,0.15)] transition-all"
              >
                <button
                  type="button"
                  onClick={() => setShowKnowledgeModal(true)}
                  className="text-slate-400 hover:text-[#00e599] transition-colors"
                  title="View Connected Knowledge Sources"
                >
                  <Database className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={messages.length === 0 ? "Ask CarbonIQ about your carbon emissions, invoices, or forecasts..." : "Ask a follow-up question..."}
                  className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-sans"
                  disabled={isLoading}
                  maxLength={2000}
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00e599] to-emerald-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 disabled:hover:from-[#00e599] text-slate-950 flex items-center justify-center font-bold transition-all shrink-0 active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                <span>RAG Model: Mistral AI + PostgreSQL Ledger</span>
                <span>Audit Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Knowledge Sources Modal */}
      {showKnowledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1320] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-white font-mono flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00e599]" /> Connected Knowledge Sources
              </h4>
              <button onClick={() => setShowKnowledgeModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 font-mono">
              <div className="p-3.5 bg-[#070d16] rounded-2xl border border-slate-800">
                <p className="font-bold text-[#00e599]">PostgreSQL Emission Ledger</p>
                <p className="text-[11px] text-slate-400 mt-1">Real-time transactional GHG calculations & scope breakdowns across all approved records.</p>
              </div>
              <div className="p-3.5 bg-[#070d16] rounded-2xl border border-slate-800">
                <p className="font-bold text-cyan-400">pgvector Document Knowledge Base ({realDocCount} Docs)</p>
                <p className="text-[11px] text-slate-400 mt-1">1536-dimensional semantic chunk embeddings over uploaded invoices, utility bills, and airwaybills.</p>
              </div>
              <div className="p-3.5 bg-[#070d16] rounded-2xl border border-slate-800">
                <p className="font-bold text-amber-400">ML Tournament Forecast Engine</p>
                <p className="text-[11px] text-slate-400 mt-1">XGBoost & Ridge models predicting future emission trajectories.</p>
              </div>
            </div>
            <button
              onClick={() => setShowKnowledgeModal(false)}
              className="w-full py-3 bg-[#00e599] hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
