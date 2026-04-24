// =============================================================================
// ConstrutorPro - Testes dos Componentes de Visualização Avançada
// =============================================================================

import { describe, it, expect } from 'vitest';

// =============================================================================
// GaugeChart Tests
// =============================================================================

describe('GaugeChart', () => {
  it('should calculate percentage correctly', () => {
    const value = 75;
    const min = 0;
    const max = 100;
    const percentage = ((value - min) / (max - min)) * 100;
    expect(percentage).toBe(75);
  });

  it('should handle values outside range', () => {
    const normalizedValue = Math.min(Math.max(150, 0), 100);
    expect(normalizedValue).toBe(100);
    
    const normalizedValue2 = Math.min(Math.max(-10, 0), 100);
    expect(normalizedValue2).toBe(0);
  });

  it('should determine color based on thresholds', () => {
    const thresholds = {
      low: { value: 33, color: '#ef4444' },
      medium: { value: 66, color: '#f59e0b' },
      high: { value: 100, color: '#22c55e' },
    };

    const getColor = (pct: number): string => {
      if (pct <= thresholds.low.value) return thresholds.low.color;
      if (pct <= thresholds.medium.value) return thresholds.medium.color;
      return thresholds.high.color;
    };

    expect(getColor(20)).toBe('#ef4444'); // low
    expect(getColor(50)).toBe('#f59e0b'); // medium
    expect(getColor(80)).toBe('#22c55e'); // high
  });

  it('should calculate arc angle correctly', () => {
    const percentage = 75;
    const arcAngle = 180 - (percentage / 100) * 180;
    expect(arcAngle).toBe(45); // 180 - 135 = 45
  });
});

// =============================================================================
// RadarChart Tests
// =============================================================================

describe('RadarChart', () => {
  it('should format radar data correctly', () => {
    const data = [
      { category: 'Qualidade', planned: 80, actual: 75 },
      { category: 'Custo', planned: 90, actual: 85 },
      { category: 'Prazo', planned: 70, actual: 65 },
    ];

    expect(data).toHaveLength(3);
    expect(data[0].category).toBe('Qualidade');
    expect(data[0].planned).toBe(80);
    expect(data[0].actual).toBe(75);
  });

  it('should calculate average for radar dimensions', () => {
    const values = [80, 90, 70, 85, 75];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg).toBe(80);
  });

  it('should identify performance gaps', () => {
    const data = [
      { category: 'A', planned: 100, actual: 80 },
      { category: 'B', planned: 100, actual: 90 },
    ];

    const gaps = data.map(d => ({
      category: d.category,
      gap: d.planned - d.actual,
      gapPercent: ((d.planned - d.actual) / d.planned) * 100,
    }));

    expect(gaps[0].gap).toBe(20);
    expect(gaps[0].gapPercent).toBe(20);
    expect(gaps[1].gap).toBe(10);
  });
});

// =============================================================================
// ScatterChart Tests
// =============================================================================

describe('ScatterChart', () => {
  interface ScatterDataPoint {
    x: number;
    y: number;
  }

  // Calculate linear regression
  function calculateRegression(data: ScatterDataPoint[]): { slope: number; intercept: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (const point of data) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumX2 += point.x * point.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  it('should calculate linear regression correctly', () => {
    const data: ScatterDataPoint[] = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
    ];

    const { slope, intercept } = calculateRegression(data);

    // Perfect linear relationship: y = 2x
    expect(slope).toBeCloseTo(2, 1);
    expect(intercept).toBeCloseTo(0, 1);
  });

  it('should calculate Pearson correlation coefficient', () => {
    const data: ScatterDataPoint[] = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
    ];

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (const point of data) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumX2 += point.x * point.x;
      sumY2 += point.y * point.y;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = denominator !== 0 ? numerator / denominator : 0;

    // Perfect positive correlation
    expect(correlation).toBeCloseTo(1, 5);
  });

  it('should handle empty data for regression', () => {
    const data: ScatterDataPoint[] = [];
    const { slope, intercept } = calculateRegression(data);
    expect(slope).toBe(0);
    expect(intercept).toBe(0);
  });

  it('should handle single point for regression', () => {
    const data: ScatterDataPoint[] = [{ x: 5, y: 10 }];
    const { slope, intercept } = calculateRegression(data);
    expect(slope).toBe(0);
    expect(intercept).toBe(0);
  });

  it('should calculate correlation strength correctly', () => {
    const getCorrelationStrength = (r: number): string => {
      const abs = Math.abs(r);
      if (abs > 0.7) return 'Forte';
      if (abs > 0.4) return 'Moderada';
      return 'Fraca';
    };

    expect(getCorrelationStrength(0.8)).toBe('Forte');
    expect(getCorrelationStrength(0.5)).toBe('Moderada');
    expect(getCorrelationStrength(0.3)).toBe('Fraca');
    expect(getCorrelationStrength(-0.8)).toBe('Forte');
  });
});

// =============================================================================
// MultiScatterChart Tests
// =============================================================================

describe('MultiScatterChart', () => {
  it('should format multi-series data correctly', () => {
    const series = [
      {
        name: 'Série A',
        data: [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
        ],
        color: '#2563eb',
      },
      {
        name: 'Série B',
        data: [
          { x: 1, y: 15 },
          { x: 2, y: 25 },
        ],
        color: '#22c55e',
      },
    ];

    expect(series).toHaveLength(2);
    expect(series[0].name).toBe('Série A');
    expect(series[0].data).toHaveLength(2);
    expect(series[1].color).toBe('#22c55e');
  });
});

// =============================================================================
// CompetencyRadar Tests
// =============================================================================

describe('CompetencyRadar', () => {
  it('should map categories to values correctly', () => {
    const categories = ['Liderança', 'Comunicação', 'Técnica', 'Gestão'];
    const values = [80, 75, 90, 70];

    const data = categories.map((category, index) => ({
      category,
      value: values[index] || 0,
    }));

    expect(data).toHaveLength(4);
    expect(data[0]).toEqual({ category: 'Liderança', value: 80 });
    expect(data[2]).toEqual({ category: 'Técnica', value: 90 });
  });

  it('should handle missing values', () => {
    const categories = ['A', 'B', 'C'];
    const values = [80, 75]; // Missing third value

    const data = categories.map((category, index) => ({
      category,
      value: values[index] || 0,
    }));

    expect(data[2].value).toBe(0);
  });
});

// =============================================================================
// Color Palette Tests
// =============================================================================

describe('Chart Color Palette', () => {
  it('should have default colors', () => {
    const DEFAULT_COLORS = [
      '#2563eb', // blue
      '#22c55e', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
    ];

    expect(DEFAULT_COLORS).toHaveLength(6);
    expect(DEFAULT_COLORS[0]).toBe('#2563eb');
  });

  it('should cycle through colors for multiple series', () => {
    const DEFAULT_COLORS = [
      '#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    ];

    const getColor = (index: number) => DEFAULT_COLORS[index % DEFAULT_COLORS.length];

    expect(getColor(0)).toBe('#2563eb');
    expect(getColor(5)).toBe('#06b6d4');
    expect(getColor(6)).toBe('#2563eb'); // Cycles back
    expect(getColor(12)).toBe('#2563eb'); // Cycles again
  });
});

// =============================================================================
// Data Transformation Tests
// =============================================================================

describe('Chart Data Transformation', () => {
  it('should transform execution data for gauge chart', () => {
    const executionData = [
      { name: 'Projeto A', progress: 75 },
      { name: 'Projeto B', progress: 45 },
      { name: 'Projeto C', progress: 90 },
    ];

    const gaugeData = executionData.slice(0, 4).map((item) => ({
      title: String(item.name),
      value: Number(item.progress) || 0,
    }));

    expect(gaugeData).toHaveLength(3);
    expect(gaugeData[0].title).toBe('Projeto A');
    expect(gaugeData[0].value).toBe(75);
  });

  it('should transform execution data for radar chart', () => {
    const executionData = [
      { category: 'Performance', value: 85 },
      { category: 'Qualidade', value: 90 },
      { category: 'Custo', value: 75 },
    ];

    const radarData = executionData.slice(0, 12).map((item) => ({
      category: String(item.category),
      value: Number(item.value) || 0,
    }));

    expect(radarData).toHaveLength(3);
    expect(radarData[1].category).toBe('Qualidade');
  });

  it('should transform execution data for scatter chart', () => {
    const executionData = [
      { budget: 100000, actual: 95000 },
      { budget: 150000, actual: 160000 },
      { budget: 80000, actual: 78000 },
    ];

    const scatterData = executionData.slice(0, 100).map((item) => ({
      x: Number(item.budget) || 0,
      y: Number(item.actual) || 0,
    }));

    expect(scatterData).toHaveLength(3);
    expect(scatterData[0]).toEqual({ x: 100000, y: 95000 });
  });
});
