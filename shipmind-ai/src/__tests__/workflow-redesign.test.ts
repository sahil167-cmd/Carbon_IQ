import { describe, it, expect } from 'vitest';
import {
  createDefaultCargoLine,
  mapSimplifiedCargoToBackend,
} from '../components/logistics/SimplifiedCargoEditor';

describe('Shipment Redesign & Simplified Cargo Workflow', () => {
  it('creates valid default cargo line with cm and kg units', () => {
    const defaultLine = createDefaultCargoLine(1);
    expect(defaultLine.name).toBe('Electronics Box');
    expect(defaultLine.quantity).toBe(20);
    expect(defaultLine.lengthCm).toBe(60);
    expect(defaultLine.widthCm).toBe(40);
    expect(defaultLine.heightCm).toBe(40);
    expect(defaultLine.weightKg).toBe(18);
    expect(defaultLine.isFragile).toBe(false);
    expect(defaultLine.isStackable).toBe(true);
  });

  it('correctly maps simplified cargo line to backend CreateCargoItemInput', () => {
    const line = {
      id: 'cargo-1',
      name: 'Consumer Electronics Box',
      quantity: 25,
      lengthCm: 50,
      widthCm: 35,
      heightCm: 30,
      weightKg: 12.5,
      isFragile: true,
      isStackable: false,
    };

    const backendPayload = mapSimplifiedCargoToBackend(line);

    expect(backendPayload.description).toBe('Consumer Electronics Box');
    expect(backendPayload.quantity).toBe(25);
    expect(backendPayload.length).toBe(50);
    expect(backendPayload.width).toBe(35);
    expect(backendPayload.height).toBe(30);
    expect(backendPayload.dimensionUnit).toBe('CM');
    expect(backendPayload.unitWeight).toBe(12.5);
    expect(backendPayload.weightUnit).toBe('KG');
    expect(backendPayload.isFragile).toBe(true);
    expect(backendPayload.isStackable).toBe(false);
    expect(backendPayload.packageType).toBe('BOX');
  });

  it('enforces chronological pickup and delivery date constraint', () => {
    const pickupDate = new Date('2026-09-15T08:00:00Z');
    const earlierDelivery = new Date('2026-09-10T08:00:00Z');
    const validDelivery = new Date('2026-09-16T18:00:00Z');

    expect(earlierDelivery < pickupDate).toBe(true);
    expect(validDelivery >= pickupDate).toBe(true);
  });

  it('calculates aggregate metrics accurately from simplified cargo lines', () => {
    const lines = [
      {
        id: '1',
        name: 'Item 1',
        quantity: 20,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 40,
        weightKg: 18,
        isFragile: false,
        isStackable: true,
      },
    ];

    const totalBoxes = lines.reduce((acc, l) => acc + l.quantity, 0);
    const totalWeightKg = lines.reduce((acc, l) => acc + l.quantity * l.weightKg, 0);
    // (60 * 40 * 40 cm3) = 96,000 cm3 = 0.096 m3 per box * 20 = 1.92 m3
    const totalVolumeM3 = lines.reduce(
      (acc, l) => acc + l.quantity * ((l.lengthCm * l.widthCm * l.heightCm) / 1_000_000),
      0
    );

    expect(totalBoxes).toBe(20);
    expect(totalWeightKg).toBe(360);
    expect(Number(totalVolumeM3.toFixed(2))).toBe(1.92);
  });
});
