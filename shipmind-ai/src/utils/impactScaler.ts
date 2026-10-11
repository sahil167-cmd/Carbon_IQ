/**
 * Utility to map raw calculated CO2e emissions (in kg) to logarithmic visual intensity parameters.
 * Ensures both small emissions (e.g. 50 kg) and enterprise-scale emissions (e.g. 500,000 kg)
 * render distinct, visually appropriate cinematic effects.
 */

export interface ImpactScalerParameters {
  particleCount: number;
  particleSpeed: number;
  atmosphereThickness: number;
  redTintIntensity: number;
  temperatureRise: number; // degrees Celsius e.g. 0.05
  temperatureRiseFormatted: string; // "+0.05°C"
  forestDamageLevel: number; // 0 to 1
  seaLevelRiseMeters: number; // 0.1 to 3.0
  iceMeltRatio: number; // 0.1 (minimal) to 0.85 (severe)
  impactLevelCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'CATASTROPHIC';
}

export function scaleImpact(co2eKg: number): ImpactScalerParameters {
  const safeKg = Math.max(1, co2eKg || 0);

  // Use logarithmic scaling base-10 to span 10 kg -> 1,000,000 kg cleanly
  const logVal = Math.log10(safeKg); // 10 -> 1, 1,000 -> 3, 10,000 -> 4, 100,000 -> 5

  // Normalized scale from 0 to 1 (assuming 10 kg to 500,000 kg range)
  const norm = Math.min(1, Math.max(0.05, (logVal - 1) / 4.7));

  const particleCount = Math.round(800 + norm * 9200); // 800 -> 10,000
  const particleSpeed = 0.5 + norm * 1.5;
  const atmosphereThickness = 0.02 + norm * 0.12;
  const redTintIntensity = 0.1 + norm * 0.85;

  const tempRiseRaw = Number((0.01 + norm * 0.49).toFixed(2));
  const tempRiseFormatted = `+${tempRiseRaw}°C`;

  const forestDamageLevel = Number((0.15 + norm * 0.85).toFixed(2));
  const seaLevelRiseMeters = Number((0.1 + norm * 2.4).toFixed(2));
  const iceMeltRatio = Number((0.15 + norm * 0.75).toFixed(2));

  let category: ImpactScalerParameters['impactLevelCategory'] = 'MODERATE';
  if (safeKg < 500) category = 'LOW';
  else if (safeKg < 5000) category = 'MODERATE';
  else if (safeKg < 25000) category = 'HIGH';
  else if (safeKg < 100000) category = 'CRITICAL';
  else category = 'CATASTROPHIC';

  return {
    particleCount,
    particleSpeed,
    atmosphereThickness,
    redTintIntensity,
    temperatureRise: tempRiseRaw,
    temperatureRiseFormatted: tempRiseFormatted,
    forestDamageLevel,
    seaLevelRiseMeters,
    iceMeltRatio,
    impactLevelCategory: category,
  };
}
