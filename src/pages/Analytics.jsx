import { useRef, useEffect, useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import { allGear, departments, totals, passRate, globalAvgGearAge } from '../dataProcessor';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

/* ─── helpers ─── */
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();

function parseAge(mfgDate) {
  if (!mfgDate) return null;
  const m = mfgDate.match(/(\d{1,2})\s*[-\/]\s*(\d{4})/);
  if (!m) return null;
  const month = parseInt(m[1]);
  const year = parseInt(m[2]);
  if (year < 1990 || year > 2030 || month < 1 || month > 12) return null;
  const mfgD = new Date(year, month - 1);
  const diffYears = (NOW - mfgD) / (1000 * 60 * 60 * 24 * 365.25);
  return diffYears > 0 && diffYears < 50 ? diffYears : null;
}

function parseMfgYear(mfgDate) {
  if (!mfgDate) return null;
  const m = mfgDate.match(/(\d{1,2})\s*[-\/]\s*(\d{4})/);
  if (!m) return null;
  const month = parseInt(m[1]);
  const year = parseInt(m[2]);
  if (year < 1990 || year > 2030 || month < 1 || month > 12) return null;
  return year + (month - 1) / 12;
}

function isFailed(status) {
  const s = (status || '').toUpperCase();
  return s === 'REPAIR' || s === 'OOS' || s === 'FAIL' || s === 'OUT OF DATE' || s === 'RECOMMEND OOS' || s === 'EXPIRED';
}

function isOOS(status) {
  const s = (status || '').toUpperCase();
  return s === 'OOS' || s === 'FAIL' || s === 'OUT OF DATE' || s === 'RECOMMEND OOS' || s === 'EXPIRED';
}

const COST_MAP = {
  'Jacket Shell': 900, 'Jacket Liner': 400, 'Pant Shell': 700, 'Pant Liner': 400,
  'Helmet': 400, 'Gloves': 100, 'Boots': 350, 'Hood': 150, 'Others': 250
};

function getCost(type) { return COST_MAP[type] || 250; }

/* Structural set cost for high-level estimates */
const AVG_SET_COST = 2500;

export default function Analytics() {
  /* ─── refs for all charts ─── */
  const mfrBarRef = useRef(null); const mfrBarCanvas = useRef(null);
  const ageFailRef = useRef(null); const ageFailCanvas = useRef(null);
  const replTimelineRef = useRef(null); const replTimelineCanvas = useRef(null);
  const failModeRef = useRef(null); const failModeCanvas = useRef(null);
  const budgetRef = useRef(null); const budgetCanvas = useRef(null);

  /* ═══════════════════════════════════════════
     SECTION 1 — Fleet Health Overview KPIs
     ═══════════════════════════════════════════ */
  const fleetKpis = useMemo(() => {
    const passRateNum = parseFloat(passRate);
    const avgAge = parseFloat(globalAvgGearAge);

    // Count items turning 10 years old in next 12 months
    let projected12mo = 0;
    allGear.forEach(g => {
      const age = parseAge(g.mfgDate);
      if (age !== null && age >= 9 && age < 10) projected12mo++;
    });

    // Weighted Fleet Health Score
    // Pass rate weight: 50%, age penalty: 30% (normalized 0-10yr = 100-0), compliance: 20%
    const agePenalty = Math.max(0, Math.min(100, 100 - (avgAge / 10) * 100));
    const expired = allGear.filter(g => { const a = parseAge(g.mfgDate); return a !== null && a >= 10; }).length;
    const complianceRate = allGear.length > 0 ? ((allGear.length - expired) / allGear.length) * 100 : 100;
    const healthScore = Math.round(passRateNum * 0.5 + agePenalty * 0.3 + complianceRate * 0.2);

    const budgetEstimate = projected12mo * AVG_SET_COST;

    return { healthScore, avgAge, projected12mo, budgetEstimate };
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 2 — Manufacturer Reliability
     ═══════════════════════════════════════════ */
  const mfrData = useMemo(() => {
    const map = {};
    allGear.forEach(g => {
      const mfr = g.manufacturer || 'Unknown';
      if (mfr === 'Unknown') return;
      if (!map[mfr]) map[mfr] = { name: mfr, total: 0, pass: 0, repair: 0, oos: 0, ages: [] };
      map[mfr].total++;
      const s = (g.status || '').toUpperCase();
      if (s.includes('PASS')) map[mfr].pass++;
      else if (s === 'REPAIR') map[mfr].repair++;
      else map[mfr].oos++;
      const age = parseAge(g.mfgDate);
      if (age !== null) map[mfr].ages.push(age);
    });

    return Object.values(map)
      .filter(m => m.total >= 10)
      .map(m => {
        const passRt = (m.pass / m.total) * 100;
        const repairRt = (m.repair / m.total) * 100;
        const oosRt = (m.oos / m.total) * 100;
        const avgAge = m.ages.length > 0 ? (m.ages.reduce((a, b) => a + b, 0) / m.ages.length) : 0;
        const score = Math.round(passRt * 0.6 + (100 - repairRt) * 0.2 + (100 - oosRt) * 0.2);
        let badge = 'RECOMMENDED';
        if (score < 70) badge = 'AVOID';
        else if (score < 80) badge = 'CAUTION';
        else if (score < 90) badge = 'MONITOR';
        return { ...m, passRate: passRt, repairRate: repairRt, oosRate: oosRt, avgAge, score, badge };
      })
      .sort((a, b) => b.score - a.score);
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 3 — Gear Lifecycle (age → failure)
     ═══════════════════════════════════════════ */
  const lifecycleData = useMemo(() => {
    // Bucket by year
    const buckets = {};
    for (let y = 0; y <= 15; y++) buckets[y] = { total: 0, failed: 0 };
    allGear.forEach(g => {
      const age = parseAge(g.mfgDate);
      if (age === null) return;
      const yr = Math.min(15, Math.floor(age));
      buckets[yr].total++;
      if (isFailed(g.status)) buckets[yr].failed++;
    });
    const labels = [];
    const rates = [];
    const counts = [];
    for (let y = 0; y <= 15; y++) {
      labels.push(`${y}yr`);
      rates.push(buckets[y].total > 0 ? ((buckets[y].failed / buckets[y].total) * 100) : 0);
      counts.push(buckets[y].total);
    }
    return { labels, rates, counts };
  }, []);

  const replacementTimeline = useMemo(() => {
    // Items aging out each year (turning 10 years old)
    const years = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3, CURRENT_YEAR + 4];
    const data = years.map(yr => {
      let count = 0;
      let cost = 0;
      allGear.forEach(g => {
        const mfgYr = parseMfgYear(g.mfgDate);
        if (mfgYr === null) return;
        const retireYear = Math.floor(mfgYr + 10);
        if (retireYear === yr) {
          count++;
          cost += getCost(g.type);
        }
      });
      return { year: yr, count, cost };
    });
    return data;
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 4 — Failure Mode Intelligence
     ═══════════════════════════════════════════ */
  const failureModes = useMemo(() => {
    const modeMap = {};
    allGear.forEach(g => {
      if (!g.findings || g.findings.trim() === '' || g.findings === 'nan') return;
      const modes = g.findings.split(';').map(s => s.trim()).filter(Boolean);
      modes.forEach(mode => {
        // Normalize mode
        const normalized = mode.replace(/\s+/g, ' ').trim();
        if (!normalized || normalized.toLowerCase() === 'nan' || normalized.length < 3) return;
        if (!modeMap[normalized]) modeMap[normalized] = { mode: normalized, count: 0, types: {}, mfrs: {} };
        modeMap[normalized].count++;
        const type = g.type || 'Other';
        modeMap[normalized].types[type] = (modeMap[normalized].types[type] || 0) + 1;
        const mfr = g.manufacturer || 'Unknown';
        if (mfr !== 'Unknown') modeMap[normalized].mfrs[mfr] = (modeMap[normalized].mfrs[mfr] || 0) + 1;
      });
    });
    return Object.values(modeMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(m => ({
        ...m,
        topType: Object.entries(m.types).sort((a, b) => b[1] - a[1])[0]?.[0] || '--',
        topMfr: Object.entries(m.mfrs).sort((a, b) => b[1] - a[1])[0]?.[0] || '--',
      }));
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 5 — Budget Forecasting
     ═══════════════════════════════════════════ */
  const budgetForecast = useMemo(() => {
    const years = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3, CURRENT_YEAR + 4];
    const typeNames = ['Jacket Shell', 'Jacket Liner', 'Pant Shell', 'Pant Liner', 'Helmet', 'Hood', 'Gloves', 'Boots', 'Others'];
    const data = years.map(yr => {
      const breakdown = {};
      typeNames.forEach(t => { breakdown[t] = 0; });
      let totalCost = 0;
      let totalCount = 0;
      allGear.forEach(g => {
        const mfgYr = parseMfgYear(g.mfgDate);
        if (mfgYr === null) return;
        const retireYear = Math.floor(mfgYr + 10);
        if (retireYear === yr) {
          const type = g.type || 'Others';
          const cost = getCost(type);
          breakdown[type] = (breakdown[type] || 0) + cost;
          totalCost += cost;
          totalCount++;
        }
      });
      return { year: yr, breakdown, totalCost, totalCount };
    });
    return { years, typeNames, data };
  }, []);

  // "Replace now vs wait" comparison
  const replaceComparison = useMemo(() => {
    // Items currently > 10 years old (already overdue)
    let overdueCount = 0;
    let overdueCost = 0;
    // Items 7-10 years (high risk)
    let highRiskCount = 0;
    let highRiskCost = 0;
    allGear.forEach(g => {
      const age = parseAge(g.mfgDate);
      if (age === null) return;
      if (age >= 10) {
        overdueCount++;
        overdueCost += getCost(g.type);
      } else if (age >= 7) {
        highRiskCount++;
        highRiskCost += getCost(g.type);
      }
    });
    const totalWaitCost = overdueCost + highRiskCost;
    return { overdueCount, overdueCost, highRiskCount, highRiskCost, totalWaitCost };
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 6 — Risk Heatmap
     ═══════════════════════════════════════════ */
  const heatmapData = useMemo(() => {
    const gearTypes = ['Jacket Shell', 'Jacket Liner', 'Pant Shell', 'Pant Liner', 'Helmet', 'Hood', 'Gloves', 'Boots'];
    const deptMap = {};
    allGear.forEach(g => {
      const dept = g.department;
      const type = g.type;
      if (!gearTypes.includes(type)) return;
      const key = `${dept}__${type}`;
      if (!deptMap[key]) deptMap[key] = { total: 0, failed: 0 };
      deptMap[key].total++;
      if (isFailed(g.status)) deptMap[key].failed++;
    });

    // Build grid rows — only include departments with data
    const deptNames = [...new Set(allGear.map(g => g.department))].sort();
    const rows = deptNames.map(dept => {
      const cells = gearTypes.map(type => {
        const key = `${dept}__${type}`;
        const d = deptMap[key];
        if (!d || d.total === 0) return { rate: 0, total: 0, failed: 0 };
        return { rate: (d.failed / d.total) * 100, total: d.total, failed: d.failed };
      });
      const totalFailed = cells.reduce((s, c) => s + c.failed, 0);
      const totalItems = cells.reduce((s, c) => s + c.total, 0);
      const overallRate = totalItems > 0 ? (totalFailed / totalItems) * 100 : 0;
      return { dept, cells, overallRate, totalItems };
    });

    // Sort by overall failure rate descending
    rows.sort((a, b) => b.overallRate - a.overallRate);

    return { gearTypes, rows };
  }, []);

  /* ═══════════════════════════════════════════
     CHARTS — useEffect
     ═══════════════════════════════════════════ */
  useEffect(() => {
    const destroyAll = [];

    // --- Manufacturer failure rate bar chart ---
    if (mfrBarCanvas.current && mfrData.length > 0) {
      if (mfrBarRef.current) mfrBarRef.current.destroy();
      const top = mfrData.slice(0, 12);
      mfrBarRef.current = new Chart(mfrBarCanvas.current, {
        type: 'bar',
        data: {
          labels: top.map(m => m.name.length > 22 ? m.name.slice(0, 20) + '…' : m.name),
          datasets: [
            {
              label: 'Repair %',
              data: top.map(m => m.repairRate.toFixed(1)),
              backgroundColor: '#f97316',
              borderRadius: 3,
              barThickness: 14,
            },
            {
              label: 'OOS/Fail %',
              data: top.map(m => m.oosRate.toFixed(1)),
              backgroundColor: '#ef4444',
              borderRadius: 3,
              barThickness: 14,
            },
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.x}%` } }
          },
          scales: {
            x: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } },
            y: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
      destroyAll.push(mfrBarRef);
    }

    // --- Age vs failure rate (line/area) ---
    if (ageFailCanvas.current) {
      if (ageFailRef.current) ageFailRef.current.destroy();
      ageFailRef.current = new Chart(ageFailCanvas.current, {
        type: 'line',
        data: {
          labels: lifecycleData.labels,
          datasets: [
            {
              label: 'Failure Rate %',
              data: lifecycleData.rates.map(r => r.toFixed(1)),
              borderColor: '#c41e24',
              backgroundColor: 'rgba(196, 30, 36, 0.08)',
              fill: true,
              tension: 0.35,
              pointRadius: 4,
              pointBackgroundColor: lifecycleData.rates.map(r => r > 15 ? '#c41e24' : r > 8 ? '#f59e0b' : '#22c55e'),
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              borderWidth: 2.5,
            },
            {
              label: 'Item Count',
              data: lifecycleData.counts,
              borderColor: '#1a2a4a',
              backgroundColor: 'rgba(26, 42, 74, 0.05)',
              fill: true,
              tension: 0.35,
              borderDash: [5, 3],
              pointRadius: 3,
              borderWidth: 1.5,
              yAxisID: 'y1',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: ctx => {
                  if (ctx.datasetIndex === 0) return `Failure Rate: ${ctx.parsed.y}%`;
                  return `Items: ${ctx.parsed.y.toLocaleString()}`;
                }
              }
            },
            annotation: {
              annotations: {
                failureCliff: {
                  type: 'box',
                  xMin: 7,
                  xMax: 15,
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  borderWidth: 1,
                  label: { content: 'DANGER ZONE', enabled: true, position: 'start' }
                }
              }
            }
          },
          scales: {
            x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%', font: { size: 11 } }, title: { display: true, text: 'Failure Rate %', font: { size: 11 } } },
            y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { font: { size: 11 } }, title: { display: true, text: 'Item Count', font: { size: 11 } } }
          }
        }
      });
      destroyAll.push(ageFailRef);
    }

    // --- Replacement timeline bar chart ---
    if (replTimelineCanvas.current) {
      if (replTimelineRef.current) replTimelineRef.current.destroy();
      replTimelineRef.current = new Chart(replTimelineCanvas.current, {
        type: 'bar',
        data: {
          labels: replacementTimeline.map(d => d.year.toString()),
          datasets: [{
            label: 'Items Aging Out',
            data: replacementTimeline.map(d => d.count),
            backgroundColor: replacementTimeline.map(d => d.count > 500 ? '#c41e24' : d.count > 200 ? '#f59e0b' : '#1a2a4a'),
            borderRadius: 4,
            barThickness: 36,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: ctx => `Est. Cost: $${replacementTimeline[ctx.dataIndex].cost.toLocaleString()}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } }
          }
        }
      });
      destroyAll.push(replTimelineRef);
    }

    // --- Failure mode horizontal bar ---
    if (failModeCanvas.current && failureModes.length > 0) {
      if (failModeRef.current) failModeRef.current.destroy();
      failModeRef.current = new Chart(failModeCanvas.current, {
        type: 'bar',
        data: {
          labels: failureModes.map(f => f.mode.length > 30 ? f.mode.slice(0, 28) + '…' : f.mode),
          datasets: [{
            label: 'Occurrences',
            data: failureModes.map(f => f.count),
            backgroundColor: failureModes.map((_, i) => {
              const colors = ['#c41e24', '#e63946', '#ef4444', '#f87171', '#f97316', '#fb923c', '#f59e0b', '#fbbf24', '#facc15', '#a3e635', '#22c55e', '#1a2a4a', '#2a3f6a', '#475569', '#64748b'];
              return colors[i % colors.length];
            }),
            borderRadius: 3,
            barThickness: 16,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            y: { grid: { display: false }, ticks: { font: { size: 10 } } }
          }
        }
      });
      destroyAll.push(failModeRef);
    }

    // --- Budget stacked bar ---
    if (budgetCanvas.current) {
      if (budgetRef.current) budgetRef.current.destroy();
      const typeColors = {
        'Jacket Shell': '#1a2a4a', 'Jacket Liner': '#2a3f6a', 'Pant Shell': '#c41e24', 'Pant Liner': '#e63946',
        'Helmet': '#f59e0b', 'Hood': '#22c55e', 'Gloves': '#6366f1', 'Boots': '#8b5cf6', 'Others': '#94a3b8'
      };
      budgetRef.current = new Chart(budgetCanvas.current, {
        type: 'bar',
        data: {
          labels: budgetForecast.years.map(String),
          datasets: budgetForecast.typeNames.map(type => ({
            label: type,
            data: budgetForecast.data.map(d => d.breakdown[type] || 0),
            backgroundColor: typeColors[type] || '#94a3b8',
            borderRadius: 2,
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`,
                footer: items => {
                  const total = items.reduce((s, i) => s + i.parsed.y, 0);
                  return `Total: $${total.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } }
          }
        }
      });
      destroyAll.push(budgetRef);
    }

    return () => { destroyAll.forEach(ref => ref.current?.destroy()); };
  }, [mfrData, lifecycleData, replacementTimeline, failureModes, budgetForecast]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  const badgeColor = (badge) => {
    switch (badge) {
      case 'RECOMMENDED': return 'bg-green-100 text-green-700 border-green-200';
      case 'MONITOR': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CAUTION': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'AVOID': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const scoreColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const scoreBg = (score) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const heatColor = (rate) => {
    if (rate === 0) return 'bg-gray-50 text-gray-400';
    if (rate < 5) return 'bg-green-50 text-green-700';
    if (rate < 10) return 'bg-green-100 text-green-800';
    if (rate < 15) return 'bg-yellow-100 text-yellow-800';
    if (rate < 25) return 'bg-orange-100 text-orange-800';
    if (rate < 40) return 'bg-red-100 text-red-700';
    return 'bg-red-200 text-red-900';
  };

  const healthColor = fleetKpis.healthScore >= 80 ? 'text-green-600' : fleetKpis.healthScore >= 60 ? 'text-amber-600' : 'text-red-600';
  const healthBarColor = fleetKpis.healthScore >= 80 ? 'from-green-400 to-green-600' : fleetKpis.healthScore >= 60 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-600';

  const totalForecastCost = budgetForecast.data.reduce((s, d) => s + d.totalCost, 0);
  const totalForecastItems = budgetForecast.data.reduce((s, d) => s + d.totalCount, 0);

  return (
    <div className="max-w-full" data-testid="analytics-page">
      <Breadcrumb items={[{ label: 'Analytics' }]} />

      {/* Page header with premium treatment */}
      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-8 bg-gradient-to-br from-navy to-navy-light rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </span>
            Fleet Intelligence &amp; Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">Deep analytics across {allGear.length.toLocaleString()} gear items · {departments.length} departments · {new Set(allGear.map(g => g.manufacturer).filter(m => m && m !== 'Unknown')).size} manufacturers</p>
        </div>
        <span className="px-3 py-1.5 bg-navy/5 text-navy text-xs font-semibold rounded-full border border-navy/10">
          Data as of {NOW.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* ═══ SECTION 1: Fleet Health Overview ═══ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-surface-border p-5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-gradient-to-b from-navy to-brand"></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
          </div>
          <div className={`text-3xl font-bold ${healthColor}`}>{fleetKpis.healthScore}</div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Fleet Health Score</div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div className={`h-full rounded-full bg-gradient-to-r ${healthBarColor}`} style={{ width: `${fleetKpis.healthScore}%` }}></div>
          </div>
        </div>

        <KpiCard
          value={`${fleetKpis.avgAge} yr`}
          label="Avg Gear Age"
          color="blue"
          icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
        />
        <KpiCard
          value={fleetKpis.projected12mo.toLocaleString()}
          label="Replacements (12mo)"
          color="orange"
          icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>}
        />
        <KpiCard
          value={`$${(fleetKpis.budgetEstimate / 1000).toFixed(0)}k`}
          label="12mo Budget Est."
          color="brand"
          icon={<svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      {/* ═══ SECTION 2: Manufacturer Reliability Scorecard ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-navy/10 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Manufacturer Reliability Scorecard</h2>
          <span className="text-xs text-gray-400 ml-2">Min. 10 items · Score = Pass% × 0.6 + (100 − Repair%) × 0.2 + (100 − OOS%) × 0.2</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Table */}
          <div className="col-span-2 bg-white rounded-lg border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Manufacturer</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Items</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Pass %</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Repair %</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">OOS %</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Avg Age</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Score</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {mfrData.map((m, i) => (
                    <tr key={m.name} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i === 0 ? 'bg-green-50/30' : ''}`}>
                      <td className="py-2.5 px-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-amber-500">★</span>}
                          {m.name}
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-3 font-medium">{m.total.toLocaleString()}</td>
                      <td className={`text-center py-2.5 px-3 font-semibold ${m.passRate >= 90 ? 'text-green-600' : m.passRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{m.passRate.toFixed(1)}%</td>
                      <td className={`text-center py-2.5 px-3 ${m.repairRate > 5 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>{m.repairRate.toFixed(1)}%</td>
                      <td className={`text-center py-2.5 px-3 ${m.oosRate > 5 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{m.oosRate.toFixed(1)}%</td>
                      <td className="text-center py-2.5 px-3 text-gray-600">{m.avgAge.toFixed(1)} yr</td>
                      <td className="text-center py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${scoreBg(m.score)}`}></div>
                          <span className={`font-bold ${scoreColor(m.score)}`}>{m.score}</span>
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor(m.badge)}`}>
                          {m.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Failure Rate by Manufacturer</h3>
            <div style={{ height: Math.max(300, mfrData.length * 32) }}><canvas ref={mfrBarCanvas}></canvas></div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: Gear Lifecycle Analysis ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-brand/10 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-brand" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Gear Lifecycle Analysis</h2>
          <span className="text-xs text-gray-400 ml-2">NFPA 1851 mandates 10-year retirement</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Age vs Failure chart */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">The Failure Cliff — Age vs. Failure Rate</h3>
              <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-semibold border border-red-100">⚠ CRITICAL INSIGHT</span>
            </div>
            <div style={{ height: 300 }}><canvas ref={ageFailCanvas}></canvas></div>
            <div className="mt-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
              <p className="text-xs text-red-800">
                <span className="font-bold">Key Finding:</span> Failure rates increase exponentially after year 7. Equipment between 0–2 years shows ~2.5% failure while 10+ year equipment can exceed 70%. This validates NFPA 1851's 10-year mandatory retirement.
              </p>
            </div>
          </div>

          {/* Replacement timeline */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">NFPA 1851 Retirement Timeline</h3>
            <div style={{ height: 300 }}><canvas ref={replTimelineCanvas}></canvas></div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {replacementTimeline.map(d => (
                <div key={d.year} className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs font-semibold text-gray-500">{d.year}</div>
                  <div className="text-sm font-bold text-gray-900">{d.count}</div>
                  <div className="text-[10px] text-gray-400">${(d.cost / 1000).toFixed(0)}k</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 4: Failure Mode Intelligence ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Failure Mode Intelligence</h2>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Failure mode chart */}
          <div className="col-span-2 bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 15 Failure Modes</h3>
            <div style={{ height: 440 }}><canvas ref={failModeCanvas}></canvas></div>
          </div>

          {/* Failure mode table */}
          <div className="col-span-3 bg-white rounded-lg border border-surface-border overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Failure Mode Detail</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">#</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Failure Mode</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Count</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Most Affected Type</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Most Affected Mfr</th>
                  </tr>
                </thead>
                <tbody>
                  {failureModes.map((f, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-2 px-4">
                        <span className="font-medium text-gray-900">{f.mode}</span>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className={`font-bold ${f.count > 200 ? 'text-red-600' : f.count > 50 ? 'text-amber-600' : 'text-gray-700'}`}>
                          {f.count.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-700">{f.topType}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{f.topMfr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 5: Budget Forecasting ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Budget Forecasting</h2>
          <span className="text-xs text-gray-400 ml-2">5-year replacement cost projection based on NFPA 1851 retirement</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Budget chart */}
          <div className="col-span-2 bg-white rounded-lg border border-surface-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Replacement Cost by Gear Type (5-Year)</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="font-semibold text-gray-900">{totalForecastItems.toLocaleString()} items</span>
                <span className="font-bold text-navy">${(totalForecastCost / 1000).toFixed(0)}k total</span>
              </div>
            </div>
            <div style={{ height: 320 }}><canvas ref={budgetCanvas}></canvas></div>
          </div>

          {/* Replace now vs wait */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-surface-border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Replace Now vs. Wait</h3>
              <div className="space-y-4">
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Overdue (10+ years)</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-2xl font-bold text-red-700">{replaceComparison.overdueCount.toLocaleString()}</span>
                      <span className="text-xs text-red-500 ml-1">items</span>
                    </div>
                    <span className="text-sm font-bold text-red-700">${(replaceComparison.overdueCost / 1000).toFixed(0)}k</span>
                  </div>
                  <p className="text-[10px] text-red-600 mt-1">Non-compliant with NFPA 1851 — liability risk</p>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">High Risk (7–10 years)</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-2xl font-bold text-amber-700">{replaceComparison.highRiskCount.toLocaleString()}</span>
                      <span className="text-xs text-amber-500 ml-1">items</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700">${(replaceComparison.highRiskCost / 1000).toFixed(0)}k</span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1">Elevated failure rates — plan replacement now</p>
                </div>

                <div className="p-3 bg-navy/5 rounded-lg border border-navy/10">
                  <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-1">Total Deferred Liability</div>
                  <div className="text-2xl font-bold text-navy">${(replaceComparison.totalWaitCost / 1000).toFixed(0)}k</div>
                  <p className="text-[10px] text-gray-500 mt-1">Combined replacement cost if acting now on all aged equipment</p>
                </div>
              </div>
            </div>

            {/* Cost reference */}
            <div className="bg-white rounded-lg border border-surface-border p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unit Cost Reference</h4>
              <div className="space-y-1.5">
                {Object.entries(COST_MAP).filter(([k]) => k !== 'Others').map(([type, cost]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{type}</span>
                    <span className="font-semibold text-gray-900">${cost.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 6: Risk Heatmap ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Risk Heatmap</h2>
          <span className="text-xs text-gray-400 ml-2">Department × Gear Type failure rate matrix</span>
        </div>

        <div className="bg-white rounded-lg border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Failure Rate by Department &amp; Gear Type</h3>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200"></span>&lt;5%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></span>5–15%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span>15–25%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-300"></span>&gt;25%</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[200px]">Department</th>
                  {heatmapData.gearTypes.map(type => (
                    <th key={type} className="text-center py-2.5 px-2 font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{type}</th>
                  ))}
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-600 uppercase tracking-wider">Overall</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.rows.slice(0, 30).map((row, ri) => (
                  <tr key={row.dept} className="border-b border-gray-100">
                    <td className="py-2 px-4 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {ri < 3 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>}
                        <span className="truncate max-w-[180px]">{row.dept}</span>
                      </div>
                    </td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="text-center py-2 px-2">
                        {cell.total > 0 ? (
                          <span className={`inline-flex min-w-[40px] justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${heatColor(cell.rate)}`}>
                            {cell.rate.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center py-2 px-3">
                      <span className={`inline-flex min-w-[44px] justify-center px-2 py-0.5 rounded font-bold text-[11px] ${heatColor(row.overallRate)}`}>
                        {row.overallRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {heatmapData.rows.length > 30 && (
            <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100">
              Showing top 30 of {heatmapData.rows.length} departments by failure rate
            </div>
          )}
        </div>
      </div>

      {/* Bottom summary */}
      <div className="bg-gradient-to-r from-navy to-navy-light rounded-lg p-6 mb-4 text-white">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Total Gear Tracked</div>
            <div className="text-2xl font-bold">{allGear.length.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Fleet Pass Rate</div>
            <div className="text-2xl font-bold">{passRate}%</div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">5-Year Forecast</div>
            <div className="text-2xl font-bold">${(totalForecastCost / 1000).toFixed(0)}k</div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Manufacturers Scored</div>
            <div className="text-2xl font-bold">{mfrData.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
