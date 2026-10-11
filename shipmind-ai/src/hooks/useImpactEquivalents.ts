import { useMemo } from 'react';

export interface ImpactEquivalents {
  drivingKm: number; // km driven in avg car
  treesCutDownYears: number; // trees required for 1 year absorption
  homesElectricityYears: number; // homes powered for 1 year
  flightsNYtoLondon: number; // one-way passenger flights NY -> London
  litersDieselBurned: number; // liters of diesel burned
}

export function useImpactEquivalents(co2eKg: number): ImpactEquivalents {
  return useMemo(() => {
    const kg = Math.max(0, co2eKg || 0);

    // EPA & DEFRA Conversion Factors
    const drivingKm = Math.round(kg * 4.76); // ~0.21 kg CO2e / km
    const treesCutDownYears = Number((kg / 22.0).toFixed(1)); // ~22 kg CO2e / tree / year
    const homesElectricityYears = Number((kg / 7200.0).toFixed(2)); // ~7,200 kg CO2e / home / year
    const flightsNYtoLondon = Number((kg / 900.0).toFixed(1)); // ~900 kg CO2e per passenger flight
    const litersDieselBurned = Math.round(kg / 2.68); // ~2.68 kg CO2e / liter diesel

    return {
      drivingKm,
      treesCutDownYears,
      homesElectricityYears,
      flightsNYtoLondon,
      litersDieselBurned,
    };
  }, [co2eKg]);
}
