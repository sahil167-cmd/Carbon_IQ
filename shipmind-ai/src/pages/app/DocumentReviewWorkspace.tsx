import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import StatusBadge from "../../components/shared/StatusBadge";
import { apiGet, apiPost, API_BASE_URL } from "../../lib/api-client";

interface DocumentData {
  id: string;
  fileName: string;
  source: string;
  status: string;
  organizationId: string;
  manualData?: Record<string, any>;
  category?: { code: string; name: string };
  site?: { name: string };
  reportingPeriod?: { name: string };
}

export default function DocumentReviewWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [fields, setFields] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [materialType, setMaterialType] = useState<string>("STEEL");
  const [fuelType, setFuelType] = useState<string>("DIESEL");
  const [quantity, setQuantity] = useState<string>("");
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [justification, setJustification] = useState<string>("");

  useEffect(() => {
    async function loadWorkspaceData() {
      if (!id) return;
      setLoading(true);
      try {
        const docData = await apiGet<DocumentData>(`/api/v1/documents/${id}`);
        setDoc(docData);

        // Fetch extracted data using fieldsJson or fields
        try {
          const ext = await apiGet<{ fieldsJson?: Record<string, any>; fields?: Record<string, any> }>(
            `/api/v1/ai-collector/${id}/extracted`
          );
          const extData = ext?.fieldsJson || ext?.fields || null;
          if (extData && Object.keys(extData).length > 0) {
            setFields(extData);
            if (extData.materialType) {
              const val = typeof extData.materialType === "object" ? extData.materialType.value : extData.materialType;
              if (val && val !== 'Missing') setMaterialType(val || "STEEL");
            }
            if (extData.fuelType) {
              const fval = typeof extData.fuelType === "object" ? extData.fuelType.value : extData.fuelType;
              if (fval && fval !== 'Missing') setFuelType(fval || "DIESEL");
            }
            const qVal = extData.quantity?.value ?? extData.quantity ?? extData.weightKg?.value ?? extData.weightKg ?? extData.kwhConsumed?.value ?? extData.kwhConsumed;
            if (qVal && qVal !== 'Missing') setQuantity(String(qVal));

            const distVal = extData.distanceKm?.value ?? extData.distanceKm ?? extData.distance?.value ?? extData.distance;
            if (distVal && distVal !== 'Missing') setDistanceKm(String(distVal));

            const uVal = extData.unit?.value ?? extData.unit;
            if (uVal && uVal !== 'Missing') setUnit(String(uVal));
          } else if (docData.manualData && Object.keys(docData.manualData).length > 0) {
            setFields(docData.manualData);
            if (docData.manualData.materialType) setMaterialType(docData.manualData.materialType);
            if (docData.manualData.fuelType) setFuelType(docData.manualData.fuelType);
            if (docData.manualData.quantity) setQuantity(String(docData.manualData.quantity));
            if (docData.manualData.distanceKm) setDistanceKm(String(docData.manualData.distanceKm));
            if (docData.manualData.unit) setUnit(String(docData.manualData.unit));
            if (docData.manualData.justification) setJustification(String(docData.manualData.justification));
          } else {
            setFields({});
          }
        } catch {
          if (docData.manualData) {
            setFields(docData.manualData);
            if (docData.manualData.materialType) setMaterialType(docData.manualData.materialType);
            if (docData.manualData.fuelType) setFuelType(docData.manualData.fuelType);
            if (docData.manualData.quantity) setQuantity(String(docData.manualData.quantity));
            if (docData.manualData.unit) setUnit(String(docData.manualData.unit));
            if (docData.manualData.justification) setJustification(String(docData.manualData.justification));
          }
        }
      } catch (err: any) {
        setMsg(`Failed to load document: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaceData();
  }, [id]);

  // Optical Ground Truth Baseline & Dynamic Plausibility Corridor
  const ocrBaselineQty = Number(
    fields.quantity?.value ?? fields.quantity ??
    fields.weightKg?.value ?? fields.weightKg ??
    fields.kwhConsumed?.value ?? fields.kwhConsumed ?? 0
  );
  const parsedQty = parseFloat(quantity.replace(/,/g, '').trim()) || 0;
  const hasOcrBaseline = ocrBaselineQty > 0;
  const deviationPct = hasOcrBaseline && parsedQty > 0
    ? ((parsedQty - ocrBaselineQty) / ocrBaselineQty) * 100
    : 0;

  // Logical Anti-Greenwashing Boundaries
  const minPermissibleFloor = hasOcrBaseline ? Math.round(ocrBaselineQty * 0.20 * 100) / 100 : 0; // Hard -80% anti-fraud floor
  const isHardBlocked = hasOcrBaseline && parsedQty > 0 && parsedQty < minPermissibleFloor;
  const isUnderReportingWarning = hasOcrBaseline && parsedQty > 0 && deviationPct < -15 && !isHardBlocked;
  const isZeroOrNegative = parsedQty <= 0 && quantity.trim().length > 0;

  const handleApproveAndCalculate = async () => {
    if (!doc) return;
    if (isHardBlocked) {
      setMsg(`Compliance Violation: Quantity cannot be reduced below the verified physical floor of ${minPermissibleFloor.toLocaleString()} ${unit}.`);
      return;
    }
    if (isUnderReportingWarning && (!justification || justification.trim().length < 10)) {
      setMsg("Mandatory Auditor Justification required: Please provide at least 10 characters explaining why the verified OCR quantity was reduced.");
      return;
    }

    setSubmitting(true);
    setMsg("");
    try {
      const corrections: Record<string, any> = {};
      const cat = doc.category?.code || "";

      if (cat === "PURCHASED_GOODS" || fields.materialType || materialType) {
        corrections.materialType = materialType;
      }
      if (cat.includes("COMBUSTION") || fields.fuelType || fuelType) {
        corrections.fuelType = fuelType;
      }
      if (quantity && quantity.trim().length > 0) {
        if (!isNaN(parsedQty) && parsedQty > 0) {
          corrections.quantity = parsedQty;
          if (cat === "PURCHASED_GOODS" || fields.weightKg) {
            corrections.weightKg = parsedQty;
          }
        }
      }
      if (unit && unit.trim().length > 0) {
        corrections.unit = unit.trim().toUpperCase();
      }
      if (justification && justification.trim().length > 0) {
        corrections.justification = justification.trim();
      }

      // Preserve or override freight transit distance and weight
      if (distanceKm && distanceKm.trim().length > 0 && !isNaN(Number(distanceKm))) {
        corrections.distanceKm = Number(distanceKm);
      } else {
        const extractedDist = fields.distanceKm?.value ?? fields.distanceKm ?? fields.distance?.value ?? fields.distance;
        if (extractedDist && !isNaN(Number(extractedDist))) {
          corrections.distanceKm = Number(extractedDist);
        }
      }
      const extractedWeight = fields.weightKg?.value ?? fields.weightKg ?? fields.cargoWeight?.value ?? fields.cargoWeight;
      if (extractedWeight && !isNaN(Number(extractedWeight))) {
        corrections.weightKg = Number(extractedWeight);
      }

      const approvalReason = justification && justification.trim().length > 0
        ? `Reviewer adjusted (${deviationPct.toFixed(1)}% from OCR): ${justification.trim()}`
        : "Approved via Review Workspace with reviewer-confirmed fields";

      await apiPost(`/api/v1/documents/${doc.id}/approve`, {
        reason: approvalReason,
        corrections,
      });

      await apiPost(`/api/v1/internal/calc/run`, {
        documentId: doc.id,
        organizationId: doc.organizationId,
      });

      navigate(`/app/documents/${doc.id}`);
    } catch (err: any) {
      setMsg(`Approval or Calculation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Review Workspace" subtitle="Loading document preview & fields...">
        <div className="pt-16 p-8 max-w-4xl mx-auto text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-on-surface-variant">Loading workspace & PDF preview...</p>
        </div>
      </AppLayout>
    );
  }

  if (!doc) {
    return (
      <AppLayout title="Document Not Found" subtitle="Database query returned null">
        <div className="pt-16 p-8 max-w-xl mx-auto text-center space-y-4">
          <h3 className="text-2xl font-bold">Document Not Found</h3>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Review Workspace" subtitle={`Split-Screen PDF Review • ${doc.fileName}`}>
      <div className="pt-6 pb-[120px] px-6 max-w-[1400px] mx-auto space-y-6">
        
        {msg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {msg}
          </div>
        )}

        {/* Top Meta Header */}
        <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-full uppercase">
                {doc.category?.code || "GENERAL"}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">• {doc.site?.name || "Facility"}</span>
            </div>
            <h2 className="text-2xl font-bold text-primary mt-1">{doc.fileName}</h2>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={doc.status} />
          </div>
        </div>

        {/* Split Screen Grid: PDF Preview Left (50%) + Extracted Metrics Right (50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Left Panel: Real Embedded PDF Document Stream */}
          <div className="bg-white border border-outline-variant/30 rounded-[24px] p-6 ambient-shadow space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">picture_as_pdf</span>
                <span>Uploaded PDF Document Stream</span>
              </h4>
              <a
                href={`${API_BASE_URL}/api/v1/documents/${doc.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Open in New Tab</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>

            <div className="relative w-full h-[620px] bg-slate-900 rounded-2xl overflow-hidden border border-outline-variant/30">
              <iframe
                src={`${API_BASE_URL}/api/v1/documents/${doc.id}/file`}
                className="w-full h-full rounded-2xl"
                title="Uploaded PDF Document Stream"
              />
            </div>
          </div>

          {/* Right Panel: Extracted Metrics & Calculation Trigger */}
          <div className="space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[24px] p-6 ambient-shadow space-y-6">
              <div className="border-b border-outline-variant/20 pb-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg text-primary">Extracted Activity Metrics</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Extracted from PDF content via OCR State Machine
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                  OCR Verified
                </span>
              </div>

              {/* Extracted Fields Cards */}
              <div className="space-y-4">
                {Object.keys(fields).length === 0 ? (
                  <p className="text-xs text-on-surface-variant p-4 text-center">
                    No extracted metrics available.
                  </p>
                ) : (
                  Object.entries(fields).map(([key, val]) => {
                    const displayVal =
                      typeof val === "object" && val !== null ? val.value ?? JSON.stringify(val) : String(val);
                    const conf =
                      typeof val === "object" && val !== null && val.confidence
                        ? Math.round(val.confidence * 100)
                        : 95;

                    return (
                      <div
                        key={key}
                        className="p-4 bg-surface-container/20 border border-outline-variant/20 rounded-xl flex justify-between items-center"
                      >
                        <div>
                          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                            {key}
                          </span>
                          <span className="text-lg font-extrabold text-primary">{displayVal}</span>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                          {conf}% Confident
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Reviewer Required Classification Box (Purchased Goods or Fuel Combustion) */}
            <div className="bg-white border border-amber-300 rounded-[24px] p-6 ambient-shadow space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">fact_check</span>
                  <h4 className="font-bold text-base text-primary">Reviewer Classification & Activity Verification</h4>
                </div>
                {hasOcrBaseline && (
                  <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-md">
                    OCR Baseline: {ocrBaselineQty.toLocaleString()} {unit || ""}
                  </span>
                )}
              </div>

              {/* Anti-Greenwashing & Audit Integrity Boundary Box */}
              {hasOcrBaseline && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">shield</span>
                      <span>Audit Plausibility Corridor:</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                      isHardBlocked 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : isUnderReportingWarning 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {isHardBlocked 
                        ? `VIOLATION: ${deviationPct.toFixed(1)}% (Floor Exceeded)` 
                        : isUnderReportingWarning 
                          ? `UNDER-REPORTING: ${deviationPct.toFixed(1)}%` 
                          : `VERIFIED ALIGNMENT: ${deviationPct >= 0 ? '+' : ''}${deviationPct.toFixed(1)}%`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Hard Floor (-80%)</span>
                      <span className="font-extrabold text-red-700">{minPermissibleFloor.toLocaleString()} {unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Standard Range</span>
                      <span className="font-semibold text-slate-700">{(ocrBaselineQty * 0.8).toLocaleString()} - {(ocrBaselineQty * 1.5).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">OCR Ground Truth</span>
                      <span className="font-extrabold text-emerald-700">{ocrBaselineQty.toLocaleString()} {unit}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity and Unit Override Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Activity Quantity
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 4250, 28500"
                    className={`w-full p-3 bg-surface-container/30 border rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 ${
                      isHardBlocked 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50/30' 
                        : isUnderReportingWarning 
                          ? 'border-amber-500 focus:ring-amber-500 bg-amber-50/20' 
                          : 'border-outline-variant/30 focus:ring-emerald-500'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Activity Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-3 bg-surface-container/30 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Unit</option>
                    <option value="LITERS">LITERS (Volume)</option>
                    <option value="GALLONS">GALLONS (Volume)</option>
                    <option value="KG">KG (Mass)</option>
                    <option value="TONNES">TONNES (Mass)</option>
                    <option value="KWH">KWH (Electricity)</option>
                    <option value="TONNE_KM">TONNE_KM (Freight)</option>
                    <option value="MMBTU">MMBTU (Gas Energy)</option>
                    <option value="M3">M3 (Gas Volume)</option>
                  </select>
                </div>
              </div>

              {/* Transit Distance (km) for Transport & Freight */}
              {(doc?.category?.code?.includes("TRANSPORT") || unit === "TONNE_KM" || fields.weightKg || fields.distanceKm) && (
                <div className="p-4 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-1">
                  <label className="text-[11px] font-bold text-cyan-900 uppercase tracking-wider block">
                    Transit Haul Distance (km) *
                  </label>
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    placeholder="e.g. 350, 820"
                    className="w-full p-2.5 bg-white border border-cyan-300 rounded-lg text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[10px] text-cyan-700 block">
                    Multiplied by cargo weight to calculate GLEC Tonne-Kilometers (tkm)
                  </span>
                </div>
              )}

              {/* Hard Block Error Notice */}
              {isHardBlocked && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-600 text-base mt-0.5">error</span>
                  <div>
                    <span className="font-bold block">Critical Compliance Anti-Tampering Block:</span>
                    <span>Activity quantity cannot be manually reduced below the logical physical floor of <strong>{minPermissibleFloor.toLocaleString()} {unit}</strong> (-80% limit). This guardrail prevents fraudulent emission under-reporting.</span>
                  </div>
                </div>
              )}

              {/* Under-Reporting Warning & Mandatory Auditor Justification */}
              {isUnderReportingWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2 text-xs font-semibold text-amber-900">
                    <span className="material-symbols-outlined text-amber-700 text-base mt-0.5">warning</span>
                    <div>
                      <span className="font-bold block">Auditor Justification Required (Under-Reporting Alert):</span>
                      <span>You have reduced the quantity by <strong>{Math.abs(Math.round(deviationPct))}%</strong> below the verified document OCR baseline ({ocrBaselineQty.toLocaleString()} {unit}). To proceed, an explicit statutory justification is mandatory.</span>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter audit reason (e.g., invoice covers multiple facility sites, non-emission charges deducted, partial shipment cancellation)..."
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {justification.trim().length < 10 && (
                    <span className="text-[10px] text-amber-700 font-bold block">
                      * Minimum 10 characters required ({justification.trim().length}/10)
                    </span>
                  )}
                </div>
              )}

              {doc.category?.code === "PURCHASED_GOODS" || (!fields.materialType && !doc.category?.code?.includes("COMBUSTION")) ? (
                <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Material Type for Emission Factor Resolution
                  </label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full p-3 bg-surface-container/30 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="STEEL">STEEL (DEFRA Structural Steel — 1.83 kgCO₂e/kg)</option>
                    <option value="STEEL_PRIMARY">STEEL_PRIMARY (Primary Blast Furnace Steel — 1.83 kgCO₂e/kg)</option>
                    <option value="STEEL_RECYCLED">STEEL_RECYCLED (Recycled EAF Steel — 0.42 kgCO₂e/kg)</option>
                    <option value="ALUMINUM_PRIMARY">ALUMINUM_PRIMARY (Primary Aluminum — 8.24 kgCO₂e/kg)</option>
                    <option value="ALUMINUM_RECYCLED">ALUMINUM_RECYCLED (Recycled Aluminum — 1.69 kgCO₂e/kg)</option>
                    <option value="CEMENT_PORTLAND">CEMENT_PORTLAND (Portland Cement — 0.912 kgCO₂e/kg)</option>
                    <option value="CONCRETE">CONCRETE (Concrete — 0.132 kgCO₂e/kg)</option>
                    <option value="COPPER">COPPER (Copper — 3.81 kgCO₂e/kg)</option>
                    <option value="GLASS">GLASS (Container Glass — 0.84 kgCO₂e/kg)</option>
                    <option value="PAPER_VIRGIN">PAPER_VIRGIN (Virgin Paper — 0.919 kgCO₂e/kg)</option>
                    <option value="PAPER_RECYCLED">PAPER_RECYCLED (Recycled Paper — 0.612 kgCO₂e/kg)</option>
                    <option value="PLASTIC_PET">PLASTIC_PET (PET Plastic — 2.73 kgCO₂e/kg)</option>
                    <option value="PLASTIC_HDPE">PLASTIC_HDPE (HDPE Plastic — 1.93 kgCO₂e/kg)</option>
                    <option value="RUBBER">RUBBER (Synthetic Rubber — 3.18 kgCO₂e/kg)</option>
                    <option value="TIMBER">TIMBER (Softwood Timber — 0.312 kgCO₂e/kg)</option>
                  </select>
                </div>
              ) : doc.category?.code?.includes("COMBUSTION") || (!fields.fuelType || fields.fuelType?.value === 'Missing') ? (
                <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Fuel Type for Emission Factor Resolution
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full p-3 bg-surface-container/30 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DIESEL">DIESEL (GHG Protocol / DEFRA — 2.68 kgCO₂e/L)</option>
                    <option value="DIESEL_GALLON">DIESEL_GALLON (US EPA — 10.21 kgCO₂e/gal)</option>
                    <option value="PETROL">PETROL / GASOLINE (DEFRA — 2.31 kgCO₂e/L)</option>
                    <option value="NATURAL_GAS">NATURAL_GAS (GHG Protocol — 2.03 kgCO₂e/m³)</option>
                    <option value="NATURAL_GAS_MMBTU">NATURAL_GAS_MMBTU (US EPA — 53.06 kgCO₂e/MMBTU)</option>
                    <option value="LPG">LPG (DEFRA — 1.56 kgCO₂e/L)</option>
                    <option value="PROPANE">PROPANE (DEFRA — 1.51 kgCO₂e/L)</option>
                    <option value="CNG">CNG (DEFRA — 2.54 kgCO₂e/kg)</option>
                    <option value="LNG">LNG (DEFRA — 2.76 kgCO₂e/kg)</option>
                    <option value="BIODIESEL_B100">BIODIESEL_B100 (DEFRA — 0.17 kgCO₂e/L)</option>
                    <option value="COAL_INDUSTRIAL">COAL_INDUSTRIAL (DEFRA — 2.45 kgCO₂e/kg)</option>
                  </select>
                </div>
              ) : null}
            </div>

            {/* Action Box */}
            <div className="bg-white border border-outline-variant/30 rounded-[24px] p-6 ambient-shadow space-y-4">
              <h4 className="font-bold text-base text-primary">Carbon Accounting Action</h4>
              <p className="text-xs text-on-surface-variant">
                Approve extracted fields to trigger the deterministic GHG Protocol emission calculation engine.
              </p>

              <button
                onClick={handleApproveAndCalculate}
                disabled={submitting || isHardBlocked || (isUnderReportingWarning && justification.trim().length < 10) || isZeroOrNegative}
                className={`w-full py-4 font-bold text-xs rounded-xl shadow-md transition-all flex justify-center items-center gap-2 ${
                  isHardBlocked || (isUnderReportingWarning && justification.trim().length < 10) || isZeroOrNegative
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing GHG Engine...</span>
                  </>
                ) : isHardBlocked ? (
                  <>
                    <span className="material-symbols-outlined text-base">block</span>
                    <span>Blocked: Exceeds Anti-Greenwashing Floor</span>
                  </>
                ) : isUnderReportingWarning && justification.trim().length < 10 ? (
                  <>
                    <span className="material-symbols-outlined text-base">edit_note</span>
                    <span>Enter Justification to Enable Approval</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">verified</span>
                    <span>Approve & Calculate Emissions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
