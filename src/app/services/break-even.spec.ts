import { describe, expect, it } from 'vitest';
import { breakEven, ProductContribution } from './break-even';

const PIZZA: ProductContribution = {
  recipeTypeId: 'rt1', name: 'Pizza', contribution: 20000, productionMinutes: 8
};
const LASAGNA: ProductContribution = {
  recipeTypeId: 'rt2', name: 'Lasaña', contribution: 25000, productionMinutes: 40
};

describe('breakEven', () => {
  it('con un solo producto, el equilibrio es el gasto entre la contribución', () => {
    const result = breakEven(6000000, [PIZZA], 30);

    expect(result.lines[0].share).toBe(1);
    expect(result.lines[0].unitsPerMonth).toBe(300);
    expect(result.lines[0].unitsPerDay).toBe(10);
  });

  it('reparte el gasto según los minutos que ocupa cada unidad', () => {
    const result = breakEven(4800000, [PIZZA, LASAGNA], 30);

    // 8 y 40 minutos: a la pizza le toca un sexto y a la lasaña cinco sextos.
    expect(result.lines[0].share).toBeCloseTo(1 / 6);
    expect(result.lines[1].share).toBeCloseTo(5 / 6);
    expect(result.lines[0].assignedFixedCost).toBe(800000);
    expect(result.lines[1].assignedFixedCost).toBe(4000000);
  });

  it('las unidades de cada línea cubren su parte del mes', () => {
    const result = breakEven(4800000, [PIZZA, LASAGNA], 30);

    expect(result.lines[0].unitsPerMonth).toBe(40);
    expect(result.lines[1].unitsPerMonth).toBe(160);
  });

  it('sin mano de obra configurada reparte por igual', () => {
    const sinMinutos = [
      { ...PIZZA, productionMinutes: 0 },
      { ...LASAGNA, productionMinutes: 0 }
    ];

    const result = breakEven(4800000, sinMinutos, 30);

    expect(result.lines[0].share).toBe(0.5);
    expect(result.lines[1].share).toBe(0.5);
  });

  it('dice también cuántas harían falta vendiendo solo eso', () => {
    const result = breakEven(6000000, [PIZZA, LASAGNA], 30);

    expect(result.lines[0].unitsAlone).toBe(300);
    expect(result.lines[1].unitsAlone).toBe(240);
  });

  it('redondea hacia arriba: media unidad no se vende', () => {
    const result = breakEven(100000, [{ ...PIZZA, contribution: 30000 }], 30);

    expect(result.lines[0].unitsPerMonth).toBe(4);
  });

  it('un producto que no deja nada no tiene equilibrio', () => {
    const result = breakEven(6000000, [{ ...PIZZA, contribution: 0 }], 30);

    expect(result.lines[0].viable).toBe(false);
    expect(result.lines[0].unitsPerMonth).toBe(0);
    expect(result.viable).toBe(false);
  });

  it('sin productos no hay equilibrio que calcular', () => {
    const result = breakEven(6000000, [], 30);

    expect(result.lines).toEqual([]);
    expect(result.viable).toBe(false);
    expect(result.totalUnitsPerMonth).toBe(0);
  });

  it('un mes sin días de operación se lee como treinta', () => {
    expect(breakEven(6000000, [PIZZA], 0).lines[0].unitsPerDay).toBe(10);
  });
});
