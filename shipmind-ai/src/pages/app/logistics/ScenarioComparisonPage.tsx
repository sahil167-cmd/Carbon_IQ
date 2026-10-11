import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sliders,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertCircle,
  Truck,
  Leaf,
  MapPin,
  Cpu,
  RefreshCw,
  Plus,
  Scale,
  Award,
} from 'lucide-react';
import AppLayout from '../../../components/layout/AppLayout';
import WhatIfScenarioModal from '../../../components/logistics/workspace/WhatIfScenarioModal';
import LogisticsService from '../../../services/logistics.service';
import type {
  Shipment,
  EvaluatedScenarioSummary,
  ScenarioComparisonResult,
  MetricComparisonItem,
  EvaluationDirection,
} from '../../../types/logistics';

export default function ScenarioComparisonPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [scenarios, setScenarios] = useState<EvaluatedScenarioSummary[]>([]);
  const [baselineId, setBaselineId] = useState<string>('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ScenarioComparisonResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState('');
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false);

  // Load shipment and all scenarios
  const loadData = useCallback(async () => {
    if (!shipmentId) return;
    setIsLoading(true);
    setError('');

    try {
      const [shipmentData, scenariosData] = await Promise.all([
        LogisticsService.getShipment(shipmentId),
        LogisticsService.getShipmentScenarios(shipmentId),
      ]);

      setShipment(shipmentData);
      setScenarios(scenariosData);

      if (scenariosData.length > 0) {
        // Set baseline: either explicit isBaseline or first one
        const baseline = scenariosData.find((s) => s.isBaseline) || scenariosData[scenariosData.length - 1] || scenariosData[0];
        setBaselineId(baseline.id);

        // Set target: first different scenario
        const target = scenariosData.find((s) => s.id !== baseline.id) || scenariosData[0];
        setSelectedTargetId(target.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scenarios for this shipment.');
    } finally {
      setIsLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute comparison when baselineId or selectedTargetId changes
  const runComparison = useCallback(async () => {
    if (!shipmentId || !baselineId || !selectedTargetId) return;
    setIsComparing(true);
    setError('');

    try {
      const result = await LogisticsService.compareShipmentScenarios(shipmentId, {
        baselineScenarioId: baselineId,
        targetScenarioIds: [selectedTargetId],
      });
      setComparisonResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute scenario comparison.');
    } finally {
      setIsComparing(false);
    }
  }, [shipmentId, baselineId, selectedTargetId]);

  useEffect(() => {
    if (baselineId && selectedTargetId) {
      runComparison();
    }
  }, [baselineId, selectedTargetId, runComparison]);

  const handleScenarioCreated = (created: EvaluatedScenarioSummary) => {
    setScenarios((prev) => [created, ...prev]);
    setSelectedTargetId(created.id);
  };

  const getDirectionBadge = (direction: EvaluationDirection, _higherIsBetter?: boolean | null) => {
    if (direction === 'FAVORABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <TrendingDown className="w-3 h-3" /> Favorable
        </span>
      );
    }
    if (direction === 'UNFAVORABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <TrendingUp className="w-3 h-3" /> Unfavorable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
        <Minus className="w-3 h-3" /> Neutral
      </span>
    );
  };

  const formatValue = (val: number | string | null, unit: string) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">N/A</span>;
    if (typeof val === 'number') {
      return `${val.toLocaleString()} ${unit}`.trim();
    }
    return `${val} ${unit}`.trim();
  };

  const formatDelta = (delta: number | null, unit: string) => {
    if (delta === null || delta === undefined) return <span className="text-slate-400 italic">N/A</span>;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toLocaleString()} ${unit}`.trim();
  };

  const formatPctDelta = (pct: number | null) => {
    if (pct === null || pct === undefined) return <span className="text-slate-400 italic">N/A</span>;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct}%`;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={`/app/shipments/${shipmentId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shipment Details
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => runComparison()}
              disabled={isComparing || scenarios.length < 2}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isComparing ? 'animate-spin' : ''}`} />
              Refresh Deltas
            </button>
            <button
              onClick={() => setIsWhatIfModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Run What-If Scenario
            </button>
          </div>
        </div>

        {/* Page Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sliders className="w-3.5 h-3.5" />
                Authoritative What-If & Scenario Comparison
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Scenario Comparison Matrix
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl">
                Compare multi-objective trade-offs for shipment{' '}
                <span className="font-semibold text-white">{shipment?.shipmentNumber || shipmentId}</span>.
                All operational, capacity, and Scope 3 GLEC carbon metrics are derived strictly from authoritative backend calculation engines.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10">
              <div className="text-right">
                <div className="text-xs text-slate-300 font-medium">Saved Scenarios</div>
                <div className="text-xl font-black text-white">{scenarios.length}</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-right">
                <div className="text-xs text-slate-300 font-medium">Cargo Manifest</div>
                <div className="text-xl font-black text-white">
                  {shipment?.cargoItems?.length ?? 0} <span className="text-xs font-normal">items</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
            <div>
              <div className="font-bold">Error Processing Comparison</div>
              <div className="text-xs text-rose-600 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <div className="text-sm font-bold text-slate-800">Retrieving Shipment Scenarios...</div>
            <p className="text-xs text-slate-400">Loading optimization audit trail and carbon allocations.</p>
          </div>
        )}

        {/* Empty State when fewer than 2 scenarios */}
        {!isLoading && scenarios.length < 2 && (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Sliders className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-slate-900">At least 2 scenarios needed for comparison</h3>
              <p className="text-xs text-slate-500">
                You currently have {scenarios.length} saved scenario. Run a What-If optimization with modified vehicle limits, compute budget, or fallbacks to evaluate trade-offs side-by-side.
              </p>
            </div>
            <button
              onClick={() => setIsWhatIfModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Run Your First What-If Scenario
            </button>
          </div>
        )}

        {/* Scenario Selectors Bar */}
        {!isLoading && scenarios.length >= 2 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Baseline Picker */}
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Baseline Reference Scenario
              </label>
              <select
                value={baselineId}
                onChange={(e) => setBaselineId(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {scenarios.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.scenarioName} ({sc.vehicleCount} trucks • {sc.overallPayloadUtilizationPct}% util) {sc.isBaseline ? '★ Baseline' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex items-center text-slate-300 font-black text-xl px-2">
              VS
            </div>

            {/* Target Picker */}
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Compared What-If Target
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full text-sm font-semibold text-indigo-950 bg-indigo-50/50 border border-indigo-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {scenarios.map((sc) => (
                  <option key={sc.id} value={sc.id} disabled={sc.id === baselineId}>
                    {sc.scenarioName} ({sc.vehicleCount} trucks • {sc.overallPayloadUtilizationPct}% util)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Win / Loss & Best Scenario Summary Cards */}
        {comparisonResult && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lowest Emissions */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider">Lowest Emissions</span>
                <Leaf className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {comparisonResult.winLossSummary.emissions.winnerValue !== null
                  ? `${comparisonResult.winLossSummary.emissions.winnerValue} kg CO₂e`
                  : 'N/A'}
              </div>
              <div className="text-xs font-medium text-slate-500 truncate">
                Winner: <span className="font-semibold text-slate-800">{comparisonResult.winLossSummary.emissions.winnerScenarioName || 'N/A'}</span>
              </div>
              {comparisonResult.winLossSummary.emissions.marginDelta !== null && (
                <div className="text-[11px] font-bold text-emerald-600">
                  {comparisonResult.winLossSummary.emissions.marginDelta < 0 ? (
                    `${Math.abs(comparisonResult.winLossSummary.emissions.marginDelta)} kg CO₂e abatement`
                  ) : (
                    'Baseline is lowest'
                  )}
                </div>
              )}
            </div>

            {/* Fewest Vehicles */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-xs font-bold uppercase tracking-wider">Fewest Vehicles</span>
                <Truck className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {comparisonResult.winLossSummary.vehicles.winnerValue}{' '}
                <span className="text-sm font-normal text-slate-500">trucks</span>
              </div>
              <div className="text-xs font-medium text-slate-500 truncate">
                Winner: <span className="font-semibold text-slate-800">{comparisonResult.winLossSummary.vehicles.winnerScenarioName}</span>
              </div>
              {comparisonResult.winLossSummary.vehicles.marginDelta !== null && (
                <div className="text-[11px] font-bold text-blue-600">
                  {comparisonResult.winLossSummary.vehicles.marginDelta < 0 ? (
                    `${Math.abs(comparisonResult.winLossSummary.vehicles.marginDelta)} fewer truck(s)`
                  ) : (
                    'Equal or baseline minimal'
                  )}
                </div>
              )}
            </div>

            {/* Highest Payload Utilization */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-xs font-bold uppercase tracking-wider">Peak Utilization</span>
                <Scale className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {comparisonResult.winLossSummary.payloadUtil.winnerValue}%
              </div>
              <div className="text-xs font-medium text-slate-500 truncate">
                Winner: <span className="font-semibold text-slate-800">{comparisonResult.winLossSummary.payloadUtil.winnerScenarioName}</span>
              </div>
              {comparisonResult.winLossSummary.payloadUtil.marginDelta !== null && (
                <div className="text-[11px] font-bold text-purple-600">
                  {comparisonResult.winLossSummary.payloadUtil.marginDelta > 0 ? (
                    `+${comparisonResult.winLossSummary.payloadUtil.marginDelta}% higher payload density`
                  ) : (
                    'Baseline is peak'
                  )}
                </div>
              )}
            </div>

            {/* Shortest Distance */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-xs font-bold uppercase tracking-wider">Shortest Distance</span>
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {comparisonResult.winLossSummary.distance.winnerValue !== null
                  ? `${comparisonResult.winLossSummary.distance.winnerValue} km`
                  : 'N/A'}
              </div>
              <div className="text-xs font-medium text-slate-500 truncate">
                Winner: <span className="font-semibold text-slate-800">{comparisonResult.winLossSummary.distance.winnerScenarioName || 'N/A'}</span>
              </div>
              {comparisonResult.winLossSummary.distance.marginDelta !== null && (
                <div className="text-[11px] font-bold text-amber-600">
                  {comparisonResult.winLossSummary.distance.marginDelta < 0 ? (
                    `${Math.abs(comparisonResult.winLossSummary.distance.marginDelta)} km shorter route`
                  ) : (
                    'Baseline route optimal'
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trade-Off Analysis & Algorithmic Rationale */}
        {comparisonResult && comparisonResult.tradeOffs.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Award className="w-4 h-4 text-indigo-600" />
              Scenario Trade-Offs & Algorithmic Insights
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparisonResult.tradeOffs.map((tradeOff, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                >
                  <div className="text-xs font-bold text-slate-800">{tradeOff.summary}</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2 text-emerald-700">
                      <span className="font-bold uppercase text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">
                        Advantage
                      </span>
                      <span>{tradeOff.advantage}</span>
                    </div>
                    <div className="flex items-start gap-2 text-amber-700">
                      <span className="font-bold uppercase text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                        Compromise
                      </span>
                      <span>{tradeOff.compromise}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Category Comparison Table */}
        {comparisonResult && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Operational & Carbon Deltas</h3>
                <p className="text-xs text-slate-500">
                  Comprehensive audit across capacity, utilization, routing, and emissions.
                </p>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Evaluated: {new Date(comparisonResult.computedAt).toLocaleTimeString()}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-6 w-1/3">Evaluation Metric</th>
                    <th className="py-3 px-4">
                      Baseline: <span className="text-slate-800">{comparisonResult.baselineScenario.scenarioName}</span>
                    </th>
                    <th className="py-3 px-4">
                      Target: <span className="text-indigo-700">{comparisonResult.comparedScenarios[0]?.scenarioName}</span>
                    </th>
                    <th className="py-3 px-4">Absolute Delta</th>
                    <th className="py-3 px-4">% Delta</th>
                    <th className="py-3 px-6 text-right">Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonResult.categories.map((group) => (
                    <Fragment key={group.category}>
                      {/* Category Header Row */}
                      <tr className="bg-slate-100/60 font-bold text-slate-700">
                        <td colSpan={6} className="py-2.5 px-6">
                          <div className="flex items-center gap-2">
                            <span>{group.title}</span>
                            <span className="text-[11px] font-normal text-slate-400">
                              — {group.description}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Metric Rows */}
                      {group.metrics.map((metric: MetricComparisonItem) => (
                        <tr
                          key={metric.key}
                          className="hover:bg-slate-50/60 transition-colors font-medium text-slate-700"
                        >
                          <td className="py-3.5 px-6 font-semibold text-slate-900">
                            <div>{metric.label}</div>
                            {metric.description && (
                              <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                                {metric.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {formatValue(metric.baselineValue, metric.unit)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-950">
                            {formatValue(metric.targetValue, metric.unit)}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {formatDelta(metric.absoluteDelta, metric.unit)}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {formatPctDelta(metric.percentageDelta)}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            {getDirectionBadge(metric.direction, metric.higherIsBetter)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Applied What-If Parameter Audit */}
        {comparisonResult && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Cpu className="w-4 h-4 text-slate-500" />
              Applied Heuristic & Algorithmic Constraint Audit
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Baseline Diagnostics */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-800">
                  {comparisonResult.baselineScenario.scenarioName}
                </div>
                <div className="space-y-1 text-slate-600">
                  <div>
                    Optimality Guarantee:{' '}
                    <span className="font-semibold text-slate-800">
                      {comparisonResult.baselineScenario.optimalityGuarantee}
                    </span>
                  </div>
                  <div>
                    Termination Condition:{' '}
                    <span className="font-semibold text-slate-800">
                      {comparisonResult.baselineScenario.searchTerminationReason}
                    </span>
                  </div>
                  <div>
                    Candidate Solutions Simulated:{' '}
                    <span className="font-semibold text-slate-800">
                      {comparisonResult.baselineScenario.candidateSolutionsEvaluated}
                    </span>
                  </div>
                  <div>
                    Execution Compute Time:{' '}
                    <span className="font-semibold text-slate-800">
                      {comparisonResult.baselineScenario.executionTimeMs} ms
                    </span>
                  </div>
                  <div>
                    Carbon Methodology:{' '}
                    <span className="font-semibold text-slate-800">
                      {comparisonResult.baselineScenario.carbonMethodology}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Diagnostics */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
                <div className="font-bold text-indigo-950">
                  {comparisonResult.comparedScenarios[0]?.scenarioName}
                </div>
                <div className="space-y-1 text-slate-600">
                  <div>
                    Optimality Guarantee:{' '}
                    <span className="font-semibold text-indigo-900">
                      {comparisonResult.comparedScenarios[0]?.optimalityGuarantee}
                    </span>
                  </div>
                  <div>
                    Termination Condition:{' '}
                    <span className="font-semibold text-indigo-900">
                      {comparisonResult.comparedScenarios[0]?.searchTerminationReason}
                    </span>
                  </div>
                  <div>
                    Candidate Solutions Simulated:{' '}
                    <span className="font-semibold text-indigo-900">
                      {comparisonResult.comparedScenarios[0]?.candidateSolutionsEvaluated}
                    </span>
                  </div>
                  <div>
                    Execution Compute Time:{' '}
                    <span className="font-semibold text-indigo-900">
                      {comparisonResult.comparedScenarios[0]?.executionTimeMs} ms
                    </span>
                  </div>
                  <div>
                    Carbon Methodology:{' '}
                    <span className="font-semibold text-indigo-900">
                      {comparisonResult.comparedScenarios[0]?.carbonMethodology}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* What-If Scenario Modal */}
      {shipment && (
        <WhatIfScenarioModal
          isOpen={isWhatIfModalOpen}
          onClose={() => setIsWhatIfModalOpen(false)}
          onSuccess={handleScenarioCreated}
          shipmentId={shipment.id}
          shipmentNumber={shipment.shipmentNumber}
          cargoCount={shipment.cargoItems?.length ?? 0}
        />
      )}
    </AppLayout>
  );
}
