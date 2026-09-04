import { describe, expect, it } from 'vitest';
import { contributionPerMinute, PriceBreakdown } from './price-calculation.service';

function breakdown(contribution: number, productionMinutes: number): PriceBreakdown {
  return {
    preparations: [], recipe: [], additions: [], packaging: [], labor: [], all: [],
    variableCost: 0, price: 0, contribution, recipeTypeId: 'rt1', productionMinutes
  };
}

describe('contributionPerMinute', () => {
  it('reparte lo que deja la unidad entre los minutos que ocupa', () => {
    expect(contributionPerMinute(breakdown(20000, 8))).toBe(2500);
  });

  it('separa dos productos que dejan lo mismo pero ocupan distinto', () => {
    // La lasaña deja más por unidad y menos por minuto: ocupa cinco veces más.
    expect(contributionPerMinute(breakdown(20000, 8))).toBeGreaterThan(
      contributionPerMinute(breakdown(25000, 40))
    );
  });

  it('sin tiempo configurado no hay nada que dividir', () => {
    expect(contributionPerMinute(breakdown(20000, 0))).toBe(0);
  });

  it('lo que se vende bajo costo deja negativo por minuto, no cero', () => {
    expect(contributionPerMinute(breakdown(-4000, 8))).toBe(-500);
  });
});
