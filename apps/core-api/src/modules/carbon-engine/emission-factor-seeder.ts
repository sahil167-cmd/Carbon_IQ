/**
 * Production Emission Factor Seeder — CarbonIQ
 * 
 * Sources:
 *   - DEFRA 2023/2024 — UK Government GHG Conversion Factors
 *   - EPA eGRID 2023 — US regional grid emission factors
 *   - CEA 2023 — India Central Electricity Authority
 *   - GLEC Framework v3 — Global Logistics Emissions Council
 *   - IPCC AR6 — Global Warming Potentials (100-year)
 *   - IEA 2023 — International Energy Agency country-level grid factors
 *   - Ecoinvent 3.9 — Materials lifecycle emission factors
 *
 * All values are in kgCO₂e per unit unless stated otherwise.
 * This seeder is IDEMPOTENT — safe to run multiple times.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FactorSeed {
  category: string;
  subCategory: string;
  region: string;
  factorValue: number;
  unit: string;
  co2eUnit: string;
  sourceSet: string;
  version: number;
}

// =============================================================================
// SCOPE 1 — STATIONARY COMBUSTION (GHG Protocol / DEFRA 2023 / EPA)
// =============================================================================
const STATIONARY_COMBUSTION: FactorSeed[] = [
  // Natural Gas — multiple units
  { category: 'STATIONARY_COMBUSTION', subCategory: 'NATURAL_GAS', region: 'GLOBAL', factorValue: 2.02, unit: 'M3', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL_2023', version: 2 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'NATURAL_GAS_THERMS', region: 'GLOBAL', factorValue: 5.31, unit: 'THERMS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'NATURAL_GAS_MMBTU', region: 'GLOBAL', factorValue: 53.06, unit: 'MMBTU', co2eUnit: 'kgCO2e', sourceSet: 'EPA_2023', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'NATURAL_GAS_GJ', region: 'GLOBAL', factorValue: 56.1, unit: 'GJ', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'NATURAL_GAS_KWH', region: 'GLOBAL', factorValue: 0.18316, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Diesel
  { category: 'STATIONARY_COMBUSTION', subCategory: 'DIESEL', region: 'GLOBAL', factorValue: 2.68, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL_2023', version: 2 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'DIESEL_GJ', region: 'GLOBAL', factorValue: 74.1, unit: 'GJ', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'DIESEL_GALLON', region: 'US', factorValue: 10.16, unit: 'GALLONS', co2eUnit: 'kgCO2e', sourceSet: 'EPA_2023', version: 1 },
  // LPG (Liquefied Petroleum Gas)
  { category: 'STATIONARY_COMBUSTION', subCategory: 'LPG', region: 'GLOBAL', factorValue: 1.56, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'LPG_KG', region: 'GLOBAL', factorValue: 2.94, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'LPG_GJ', region: 'GLOBAL', factorValue: 63.1, unit: 'GJ', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Propane
  { category: 'STATIONARY_COMBUSTION', subCategory: 'PROPANE', region: 'GLOBAL', factorValue: 1.51, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'PROPANE_GALLON', region: 'US', factorValue: 5.72, unit: 'GALLONS', co2eUnit: 'kgCO2e', sourceSet: 'EPA_2023', version: 1 },
  // Fuel Oil (Heavy/Residual)
  { category: 'STATIONARY_COMBUSTION', subCategory: 'FUEL_OIL_HEAVY', region: 'GLOBAL', factorValue: 3.18, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'FUEL_OIL_LIGHT', region: 'GLOBAL', factorValue: 2.76, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Coal
  { category: 'STATIONARY_COMBUSTION', subCategory: 'COAL_INDUSTRIAL', region: 'GLOBAL', factorValue: 2.42, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'COAL_GJ', region: 'GLOBAL', factorValue: 94.6, unit: 'GJ', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_2006', version: 1 },
  // Biomass / Biogas (biogenic CO₂ reported separately per GHG Protocol)
  { category: 'STATIONARY_COMBUSTION', subCategory: 'BIOMASS_WOOD', region: 'GLOBAL', factorValue: 0.01539, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'STATIONARY_COMBUSTION', subCategory: 'BIOGAS', region: 'GLOBAL', factorValue: 0.00023, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Kerosene
  { category: 'STATIONARY_COMBUSTION', subCategory: 'KEROSENE', region: 'GLOBAL', factorValue: 2.54, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Petrol (Gasoline) for stationary generators
  { category: 'STATIONARY_COMBUSTION', subCategory: 'PETROL', region: 'GLOBAL', factorValue: 2.31, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// SCOPE 1 — MOBILE COMBUSTION (DEFRA 2024 / EPA / GHG Protocol)
// =============================================================================
const MOBILE_COMBUSTION: FactorSeed[] = [
  { category: 'MOBILE_COMBUSTION', subCategory: 'DIESEL', region: 'GLOBAL', factorValue: 2.70, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 2 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'PETROL', region: 'GLOBAL', factorValue: 2.31, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 2 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'CNG', region: 'GLOBAL', factorValue: 2.54, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'LNG', region: 'GLOBAL', factorValue: 2.76, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'JET_FUEL_A1', region: 'GLOBAL', factorValue: 2.55, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'MARINE_HFO', region: 'GLOBAL', factorValue: 3.11, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'MARINE_MGO', region: 'GLOBAL', factorValue: 2.78, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'BIODIESEL_B20', region: 'GLOBAL', factorValue: 2.15, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'BIODIESEL_B100', region: 'GLOBAL', factorValue: 0.17, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'E85_ETHANOL', region: 'US', factorValue: 1.34, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'EPA_2023', version: 1 },
  // Per-vehicle-km factors (DEFRA average car)
  { category: 'MOBILE_COMBUSTION', subCategory: 'CAR_AVERAGE_PETROL', region: 'GLOBAL', factorValue: 0.17440, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'CAR_AVERAGE_DIESEL', region: 'GLOBAL', factorValue: 0.16844, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'CAR_AVERAGE_HYBRID', region: 'GLOBAL', factorValue: 0.11862, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'CAR_AVERAGE_BEV', region: 'GLOBAL', factorValue: 0.04584, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'VAN_DIESEL', region: 'GLOBAL', factorValue: 0.24982, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'HGV_RIGID_DIESEL', region: 'GLOBAL', factorValue: 0.52688, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'HGV_ARTIC_DIESEL', region: 'GLOBAL', factorValue: 0.92544, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'MOBILE_COMBUSTION', subCategory: 'MOTORCYCLE', region: 'GLOBAL', factorValue: 0.11337, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// SCOPE 1 — FUGITIVE EMISSIONS (IPCC AR6 GWPs)
// =============================================================================
const FUGITIVE_EMISSIONS: FactorSeed[] = [
  // Refrigerants — IPCC AR6 100-year GWP values
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R134A', region: 'GLOBAL', factorValue: 1430, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 2 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R404A', region: 'GLOBAL', factorValue: 3922, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 2 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R410A', region: 'GLOBAL', factorValue: 2088, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R407C', region: 'GLOBAL', factorValue: 1774, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R32', region: 'GLOBAL', factorValue: 675, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R290_PROPANE', region: 'GLOBAL', factorValue: 3, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R744_CO2', region: 'GLOBAL', factorValue: 1, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R1234YF', region: 'GLOBAL', factorValue: 4, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'R1234ZE', region: 'GLOBAL', factorValue: 7, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  // Industrial gases
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'SF6', region: 'GLOBAL', factorValue: 25200, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'NF3', region: 'GLOBAL', factorValue: 17200, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'CO2_FIRE_SUPPRESSION', region: 'GLOBAL', factorValue: 1, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'HFC_23', region: 'GLOBAL', factorValue: 14800, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'METHANE_CH4', region: 'GLOBAL', factorValue: 28, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
  { category: 'FUGITIVE_EMISSIONS', subCategory: 'N2O', region: 'GLOBAL', factorValue: 265, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_AR6', version: 1 },
];

// =============================================================================
// SCOPE 2 — ELECTRICITY (IEA 2023 / EPA eGRID / CEA / IGES)
// =============================================================================
const ELECTRICITY: FactorSeed[] = [
  // ── Americas ──
  { category: 'ELECTRICITY', subCategory: 'US_GRID', region: 'US', factorValue: 0.3856, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_EGRID_2023', version: 2 },
  { category: 'ELECTRICITY', subCategory: 'US_ERCOT', region: 'US', factorValue: 0.3944, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_EGRID_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'US_PJM', region: 'US', factorValue: 0.3718, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_EGRID_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'US_MISO', region: 'US', factorValue: 0.4613, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_EGRID_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'US_WECC', region: 'US', factorValue: 0.3054, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_EGRID_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'US_NPCC', region: 'US', factorValue: 0.2109, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_EGRID_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'CA_GRID', region: 'CA', factorValue: 0.1100, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'BR_GRID', region: 'BR', factorValue: 0.0740, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'MX_GRID', region: 'MX', factorValue: 0.4310, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  // ── Europe ──
  { category: 'ELECTRICITY', subCategory: 'EU_GRID', region: 'EU', factorValue: 0.2556, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'AIB_2023', version: 2 },
  { category: 'ELECTRICITY', subCategory: 'UK_GRID', region: 'GB', factorValue: 0.20707, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'DE_GRID', region: 'DE', factorValue: 0.3850, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'FR_GRID', region: 'FR', factorValue: 0.0520, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'IT_GRID', region: 'IT', factorValue: 0.3150, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'ES_GRID', region: 'ES', factorValue: 0.1610, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'PL_GRID', region: 'PL', factorValue: 0.6940, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'SE_GRID', region: 'SE', factorValue: 0.0130, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'NO_GRID', region: 'NO', factorValue: 0.0080, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  // ── Asia Pacific ──
  { category: 'ELECTRICITY', subCategory: 'IN_GRID', region: 'IN', factorValue: 0.7160, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'CEA_2023', version: 2 },
  { category: 'ELECTRICITY', subCategory: 'CN_GRID', region: 'CN', factorValue: 0.5810, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'JP_GRID', region: 'JP', factorValue: 0.4570, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'KR_GRID', region: 'KR', factorValue: 0.4590, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'AU_GRID', region: 'AU', factorValue: 0.6800, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'NZ_GRID', region: 'NZ', factorValue: 0.0980, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'SG_GRID', region: 'SG', factorValue: 0.4085, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'TH_GRID', region: 'TH', factorValue: 0.4930, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'ID_GRID', region: 'ID', factorValue: 0.7610, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'MY_GRID', region: 'MY', factorValue: 0.5850, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'PH_GRID', region: 'PH', factorValue: 0.5510, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'VN_GRID', region: 'VN', factorValue: 0.5750, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  // ── Middle East & Africa ──
  { category: 'ELECTRICITY', subCategory: 'AE_GRID', region: 'AE', factorValue: 0.4180, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'SA_GRID', region: 'SA', factorValue: 0.5650, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'ZA_GRID', region: 'ZA', factorValue: 0.9280, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'NG_GRID', region: 'NG', factorValue: 0.4260, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'KE_GRID', region: 'KE', factorValue: 0.2580, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'EG_GRID', region: 'EG', factorValue: 0.4540, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  // Global average fallback
  { category: 'ELECTRICITY', subCategory: 'GLOBAL_AVG', region: 'GLOBAL', factorValue: 0.4360, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  // Scope 2 Market-based residual mix factors (for market-based reporting when no RECs)
  { category: 'ELECTRICITY', subCategory: 'RESIDUAL_MIX_US', region: 'US', factorValue: 0.4483, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GREEN_E_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'RESIDUAL_MIX_EU', region: 'EU', factorValue: 0.3760, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'AIB_2023', version: 1 },
  { category: 'ELECTRICITY', subCategory: 'RESIDUAL_MIX_UK', region: 'GB', factorValue: 0.3233, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// SCOPE 3 — UPSTREAM TRANSPORT & DISTRIBUTION (GLEC v3 / DEFRA)
// =============================================================================
const TRANSPORT: FactorSeed[] = [
  // Road Freight
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'ROAD_HEAVY_TRUCK', region: 'GLOBAL', factorValue: 0.0921, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 2 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'ROAD_LIGHT_VAN', region: 'GLOBAL', factorValue: 0.5970, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'ROAD_ARTICULATED_40T', region: 'GLOBAL', factorValue: 0.0460, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'ROAD_RIGID_7_5T', region: 'GLOBAL', factorValue: 0.2230, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  // Air Freight
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'AIR_FREIGHT_SHORT', region: 'GLOBAL', factorValue: 1.1281, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'AIR_FREIGHT_LONG', region: 'GLOBAL', factorValue: 0.6023, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'AIR_FREIGHT', region: 'GLOBAL', factorValue: 0.6023, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 2 },
  // Ocean Freight
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'OCEAN_CONTAINER', region: 'GLOBAL', factorValue: 0.0161, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'OCEAN_BULK', region: 'GLOBAL', factorValue: 0.0048, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'OCEAN_TANKER', region: 'GLOBAL', factorValue: 0.0050, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'OCEAN_REEFER', region: 'GLOBAL', factorValue: 0.0322, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'OCEAN_FREIGHT', region: 'GLOBAL', factorValue: 0.0161, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 2 },
  // Rail Freight
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'RAIL_ELECTRIC', region: 'GLOBAL', factorValue: 0.0245, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'RAIL_DIESEL', region: 'GLOBAL', factorValue: 0.0290, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  // Inland Waterway
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'BARGE_INLAND', region: 'GLOBAL', factorValue: 0.0310, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  // Pipeline
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'PIPELINE_GAS', region: 'GLOBAL', factorValue: 0.0022, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'UPSTREAM_TRANSPORT', subCategory: 'PIPELINE_LIQUID', region: 'GLOBAL', factorValue: 0.0040, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// SCOPE 3 — PURCHASED GOODS & SERVICES (DEFRA / Ecoinvent / EXIOBASE EEIO)
// =============================================================================
const PURCHASED_GOODS: FactorSeed[] = [
  // Activity-based (kgCO₂e per kg of material)
  { category: 'PURCHASED_GOODS', subCategory: 'STEEL_PRIMARY', region: 'GLOBAL', factorValue: 1.83, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 2 },
  { category: 'PURCHASED_GOODS', subCategory: 'STEEL_RECYCLED', region: 'GLOBAL', factorValue: 0.42, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'ALUMINUM_PRIMARY', region: 'GLOBAL', factorValue: 8.24, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'ALUMINUM_RECYCLED', region: 'GLOBAL', factorValue: 1.69, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'CEMENT_PORTLAND', region: 'GLOBAL', factorValue: 0.912, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'CONCRETE', region: 'GLOBAL', factorValue: 0.132, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'PLASTIC_PET', region: 'GLOBAL', factorValue: 2.73, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'PLASTIC_HDPE', region: 'GLOBAL', factorValue: 1.93, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'PLASTIC_LDPE', region: 'GLOBAL', factorValue: 2.08, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'PLASTIC_PP', region: 'GLOBAL', factorValue: 1.95, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'PAPER_VIRGIN', region: 'GLOBAL', factorValue: 0.919, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'PAPER_RECYCLED', region: 'GLOBAL', factorValue: 0.612, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'GLASS', region: 'GLOBAL', factorValue: 0.840, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'COPPER', region: 'GLOBAL', factorValue: 3.81, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'COTTON', region: 'GLOBAL', factorValue: 5.23, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'POLYESTER', region: 'GLOBAL', factorValue: 5.55, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'RUBBER', region: 'GLOBAL', factorValue: 3.18, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'TIMBER', region: 'GLOBAL', factorValue: 0.312, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Spend-based EEIO factors (kgCO₂e per USD spent)
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_FOOD_AGRICULTURE', region: 'GLOBAL', factorValue: 0.75, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_CHEMICALS', region: 'GLOBAL', factorValue: 0.61, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_MACHINERY', region: 'GLOBAL', factorValue: 0.32, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_ELECTRONICS', region: 'GLOBAL', factorValue: 0.28, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_TEXTILES', region: 'GLOBAL', factorValue: 0.51, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_PAPER_PRODUCTS', region: 'GLOBAL', factorValue: 0.45, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_IT_SERVICES', region: 'GLOBAL', factorValue: 0.12, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_PROFESSIONAL_SERVICES', region: 'GLOBAL', factorValue: 0.08, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'PURCHASED_GOODS', subCategory: 'EEIO_CONSTRUCTION', region: 'GLOBAL', factorValue: 0.54, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
];

// =============================================================================
// SCOPE 3 — WASTE MANAGEMENT (DEFRA 2024)
// =============================================================================
const WASTE: FactorSeed[] = [
  { category: 'WASTE_MANAGEMENT', subCategory: 'LANDFILL_MIXED', region: 'GLOBAL', factorValue: 0.4600, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 2 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'LANDFILL_ORGANIC', region: 'GLOBAL', factorValue: 0.5867, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'INCINERATION_MIXED', region: 'GLOBAL', factorValue: 0.0216, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'INCINERATION_PLASTIC', region: 'GLOBAL', factorValue: 2.5300, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'RECYCLING_MIXED', region: 'GLOBAL', factorValue: 0.0210, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 2 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'RECYCLING_METAL', region: 'GLOBAL', factorValue: 0.0210, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'RECYCLING_PAPER', region: 'GLOBAL', factorValue: 0.0210, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'RECYCLING_PLASTIC', region: 'GLOBAL', factorValue: 0.0210, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'COMPOSTING', region: 'GLOBAL', factorValue: 0.0087, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'ANAEROBIC_DIGESTION', region: 'GLOBAL', factorValue: 0.0103, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'OPEN_BURNING', region: 'GLOBAL', factorValue: 1.2800, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'IPCC_2006', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'WASTEWATER_INDUSTRIAL', region: 'GLOBAL', factorValue: 0.708, unit: 'M3', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WASTE_MANAGEMENT', subCategory: 'WASTEWATER_DOMESTIC', region: 'GLOBAL', factorValue: 0.272, unit: 'M3', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// SCOPE 3 — BUSINESS TRAVEL (DEFRA 2024)
// =============================================================================
const BUSINESS_TRAVEL: FactorSeed[] = [
  // Air travel (per passenger-km)
  { category: 'BUSINESS_TRAVEL', subCategory: 'AIR_SHORT_ECONOMY', region: 'GLOBAL', factorValue: 0.25493, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'AIR_SHORT_BUSINESS', region: 'GLOBAL', factorValue: 0.38240, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'AIR_LONG_ECONOMY', region: 'GLOBAL', factorValue: 0.14787, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'AIR_LONG_PREMIUM_ECON', region: 'GLOBAL', factorValue: 0.23659, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'AIR_LONG_BUSINESS', region: 'GLOBAL', factorValue: 0.42882, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'AIR_LONG_FIRST', region: 'GLOBAL', factorValue: 0.59149, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Rail travel
  { category: 'BUSINESS_TRAVEL', subCategory: 'RAIL_NATIONAL', region: 'GLOBAL', factorValue: 0.03549, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'RAIL_INTERNATIONAL', region: 'GLOBAL', factorValue: 0.00446, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Ground transport
  { category: 'BUSINESS_TRAVEL', subCategory: 'BUS_LOCAL', region: 'GLOBAL', factorValue: 0.10312, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'BUS_COACH', region: 'GLOBAL', factorValue: 0.02732, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'TAXI_REGULAR', region: 'GLOBAL', factorValue: 0.14894, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'TAXI_BLACK_CAB', region: 'GB', factorValue: 0.20769, unit: 'PKM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'RENTAL_CAR_AVERAGE', region: 'GLOBAL', factorValue: 0.17090, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Hotel Accommodation (kgCO₂e per room-night)
  { category: 'BUSINESS_TRAVEL', subCategory: 'HOTEL_UK', region: 'GB', factorValue: 18.39, unit: 'NIGHT', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'HOTEL_US', region: 'US', factorValue: 29.60, unit: 'NIGHT', co2eUnit: 'kgCO2e', sourceSet: 'CORNELL_HTR', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'HOTEL_EUROPE', region: 'EU', factorValue: 20.60, unit: 'NIGHT', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'HOTEL_APAC', region: 'GLOBAL', factorValue: 33.20, unit: 'NIGHT', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'BUSINESS_TRAVEL', subCategory: 'HOTEL_GLOBAL_AVG', region: 'GLOBAL', factorValue: 25.40, unit: 'NIGHT', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// SCOPE 3 — EMPLOYEE COMMUTING (DEFRA 2024)
// =============================================================================
const EMPLOYEE_COMMUTING: FactorSeed[] = [
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'CAR_PETROL', region: 'GLOBAL', factorValue: 0.17440, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'CAR_DIESEL', region: 'GLOBAL', factorValue: 0.16844, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'CAR_HYBRID', region: 'GLOBAL', factorValue: 0.11862, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'CAR_ELECTRIC_BEV', region: 'GLOBAL', factorValue: 0.04584, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'BUS', region: 'GLOBAL', factorValue: 0.10312, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'RAIL', region: 'GLOBAL', factorValue: 0.03549, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'MOTORCYCLE', region: 'GLOBAL', factorValue: 0.11337, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'BICYCLE', region: 'GLOBAL', factorValue: 0.0, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'WALKING', region: 'GLOBAL', factorValue: 0.0, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'WORK_FROM_HOME', region: 'GLOBAL', factorValue: 0.30, unit: 'DAY', co2eUnit: 'kgCO2e', sourceSet: 'ECOACT_2023', version: 1 },
  { category: 'EMPLOYEE_COMMUTING', subCategory: 'METRO_SUBWAY', region: 'GLOBAL', factorValue: 0.02975, unit: 'KM', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// SCOPE 3 — CAPITAL GOODS (DEFRA / Ecoinvent)
// =============================================================================
const CAPITAL_GOODS: FactorSeed[] = [
  { category: 'CAPITAL_GOODS', subCategory: 'EEIO_MACHINERY', region: 'GLOBAL', factorValue: 0.32, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'CAPITAL_GOODS', subCategory: 'EEIO_VEHICLES', region: 'GLOBAL', factorValue: 0.39, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'CAPITAL_GOODS', subCategory: 'EEIO_IT_EQUIPMENT', region: 'GLOBAL', factorValue: 0.28, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'CAPITAL_GOODS', subCategory: 'EEIO_BUILDINGS', region: 'GLOBAL', factorValue: 0.54, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
  { category: 'CAPITAL_GOODS', subCategory: 'EEIO_FURNITURE', region: 'GLOBAL', factorValue: 0.25, unit: 'USD', co2eUnit: 'kgCO2e', sourceSet: 'EXIOBASE_V3', version: 1 },
];

// =============================================================================
// SCOPE 3 — FUEL & ENERGY RELATED ACTIVITIES (WTT factors — DEFRA 2024)
// =============================================================================
const FUEL_ENERGY_RELATED: FactorSeed[] = [
  // Well-To-Tank (upstream) factors for fuels
  { category: 'FUEL_ENERGY_WTT', subCategory: 'WTT_DIESEL', region: 'GLOBAL', factorValue: 0.62, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'FUEL_ENERGY_WTT', subCategory: 'WTT_PETROL', region: 'GLOBAL', factorValue: 0.60, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'FUEL_ENERGY_WTT', subCategory: 'WTT_NATURAL_GAS', region: 'GLOBAL', factorValue: 0.35, unit: 'M3', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'FUEL_ENERGY_WTT', subCategory: 'WTT_LPG', region: 'GLOBAL', factorValue: 0.18, unit: 'LITERS', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'FUEL_ENERGY_WTT', subCategory: 'WTT_COAL', region: 'GLOBAL', factorValue: 0.39, unit: 'KG', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  // Transmission & Distribution losses
  { category: 'FUEL_ENERGY_WTT', subCategory: 'T_AND_D_LOSS_UK', region: 'GB', factorValue: 0.01879, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'FUEL_ENERGY_WTT', subCategory: 'T_AND_D_LOSS_US', region: 'US', factorValue: 0.02310, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_2023', version: 1 },
  { category: 'FUEL_ENERGY_WTT', subCategory: 'T_AND_D_LOSS_GLOBAL', region: 'GLOBAL', factorValue: 0.02500, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'IEA_2023', version: 1 },
  // WTT for grid electricity
  { category: 'FUEL_ENERGY_WTT', subCategory: 'WTT_ELECTRICITY_UK', region: 'GB', factorValue: 0.02362, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'FUEL_ENERGY_WTT', subCategory: 'WTT_ELECTRICITY_US', region: 'US', factorValue: 0.04750, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'EPA_2023', version: 1 },
];

// =============================================================================
// SCOPE 3 — DOWNSTREAM TRANSPORT (GLEC v3)
// =============================================================================
const DOWNSTREAM_TRANSPORT: FactorSeed[] = [
  { category: 'DOWNSTREAM_TRANSPORT', subCategory: 'ROAD_HEAVY_TRUCK', region: 'GLOBAL', factorValue: 0.0921, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'DOWNSTREAM_TRANSPORT', subCategory: 'AIR_FREIGHT', region: 'GLOBAL', factorValue: 0.6023, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'DOWNSTREAM_TRANSPORT', subCategory: 'OCEAN_CONTAINER', region: 'GLOBAL', factorValue: 0.0161, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'DOWNSTREAM_TRANSPORT', subCategory: 'RAIL', region: 'GLOBAL', factorValue: 0.0268, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
  { category: 'DOWNSTREAM_TRANSPORT', subCategory: 'LAST_MILE_VAN', region: 'GLOBAL', factorValue: 0.5970, unit: 'TONNE_KM', co2eUnit: 'kgCO2e', sourceSet: 'GLEC_V3', version: 1 },
];

// =============================================================================
// WATER (DEFRA 2024)
// =============================================================================
const WATER: FactorSeed[] = [
  { category: 'WATER', subCategory: 'WATER_SUPPLY', region: 'GLOBAL', factorValue: 0.149, unit: 'M3', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
  { category: 'WATER', subCategory: 'WATER_TREATMENT', region: 'GLOBAL', factorValue: 0.272, unit: 'M3', co2eUnit: 'kgCO2e', sourceSet: 'DEFRA_2024', version: 1 },
];

// =============================================================================
// RENEWABLE ENERGY (unchanged — 0 factors for market-based REC offsets)
// =============================================================================
const RENEWABLE: FactorSeed[] = [
  { category: 'RENEWABLE_ENERGY', subCategory: 'SOLAR', region: 'GLOBAL', factorValue: 0, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 2 },
  { category: 'RENEWABLE_ENERGY', subCategory: 'WIND', region: 'GLOBAL', factorValue: 0, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 2 },
  { category: 'RENEWABLE_ENERGY', subCategory: 'HYDRO', region: 'GLOBAL', factorValue: 0, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 2 },
  { category: 'RENEWABLE_ENERGY', subCategory: 'GEOTHERMAL', region: 'GLOBAL', factorValue: 0, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 2 },
  { category: 'RENEWABLE_ENERGY', subCategory: 'REC', region: 'GLOBAL', factorValue: 0, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 2 },
  { category: 'RENEWABLE_ENERGY', subCategory: 'IREC', region: 'GLOBAL', factorValue: 0, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 2 },
  { category: 'RENEWABLE_ENERGY', subCategory: 'GO_GUARANTEE_ORIGIN', region: 'EU', factorValue: 0, unit: 'KWH', co2eUnit: 'kgCO2e', sourceSet: 'GHG_PROTOCOL', version: 2 },
];

// =============================================================================
// SEEDER EXECUTION
// =============================================================================

const ALL_FACTORS = [
  ...STATIONARY_COMBUSTION,
  ...MOBILE_COMBUSTION,
  ...FUGITIVE_EMISSIONS,
  ...ELECTRICITY,
  ...TRANSPORT,
  ...PURCHASED_GOODS,
  ...WASTE,
  ...BUSINESS_TRAVEL,
  ...EMPLOYEE_COMMUTING,
  ...CAPITAL_GOODS,
  ...FUEL_ENERGY_RELATED,
  ...DOWNSTREAM_TRANSPORT,
  ...WATER,
  ...RENEWABLE,
];

async function seedEmissionFactors(): Promise<void> {
  console.log(`\n${'═'.repeat(70)}`);
  console.log('  CarbonIQ — Production Emission Factor Seeder');
  console.log(`  Total Factors to Seed: ${ALL_FACTORS.length}`);
  console.log(`${'═'.repeat(70)}\n`);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const f of ALL_FACTORS) {
    try {
      // Check if an identical or older-version factor exists
      const existing = await prisma.emissionFactor.findFirst({
        where: {
          category: f.category,
          subCategory: f.subCategory,
          region: f.region,
          sourceSet: f.sourceSet,
        },
        orderBy: { version: 'desc' },
      });

      if (existing && existing.version >= f.version) {
        skipped++;
        continue;
      }

      // Upsert with unique constraint
      await prisma.emissionFactor.upsert({
        where: {
          category_subCategory_region_sourceSet_version: {
            category: f.category,
            subCategory: f.subCategory,
            region: f.region,
            sourceSet: f.sourceSet,
            version: f.version,
          },
        },
        update: {
          factorValue: f.factorValue,
          unit: f.unit,
          co2eUnit: f.co2eUnit,
        },
        create: {
          category: f.category,
          subCategory: f.subCategory,
          region: f.region,
          factorValue: f.factorValue,
          unit: f.unit,
          co2eUnit: f.co2eUnit,
          sourceSet: f.sourceSet,
          version: f.version,
          createdBy: 'SEED_PRODUCTION_V2',
        },
      });

      if (existing) {
        updated++;
        console.log(`  ⬆ UPDATED: ${f.category} / ${f.subCategory} / ${f.region} v${f.version}`);
      } else {
        created++;
      }
    } catch (err: any) {
      console.error(`  ✗ ERROR: ${f.category}/${f.subCategory}/${f.region}: ${err.message}`);
    }
  }

  // Print summary by category
  const categorySummary = ALL_FACTORS.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n${'─'.repeat(70)}`);
  console.log('  Category Breakdown:');
  for (const [cat, count] of Object.entries(categorySummary).sort()) {
    console.log(`    ${cat.padEnd(35)} ${String(count).padStart(4)} factors`);
  }

  const totalInDb = await prisma.emissionFactor.count();
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  RESULTS: Created: ${created} | Updated: ${updated} | Skipped: ${skipped}`);
  console.log(`  TOTAL FACTORS IN DATABASE: ${totalInDb}`);
  console.log(`${'═'.repeat(70)}\n`);
}

seedEmissionFactors()
  .then(() => {
    console.log('✅ Emission factor seeding complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
