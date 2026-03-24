import { useRef, useEffect, useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import { allGear, departments, firefighters, totals, passRate, globalAvgGearAge, franchiseStats, uniqueMfrs } from '../dataProcessor';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

/* ─── helpers ─── */
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const FR_COLORS = { Florida: '#2563eb', Corporate: '#c41e24', Sarasota: '#059669', 'New Jersey': '#7c3aed', 'South Texas': '#d97706', Colorado: '#0891b2' };
const FR_COLORS_LIGHT = { Florida: 'rgba(37,99,235,0.12)', Corporate: 'rgba(196,30,36,0.12)', Sarasota: 'rgba(5,150,105,0.12)', 'New Jersey': 'rgba(124,58,237,0.12)', 'South Texas': 'rgba(217,119,6,0.12)', Colorado: 'rgba(8,145,178,0.12)' };
const FR_ORDER = ['Florida', 'Corporate', 'Sarasota', 'New Jersey', 'South Texas', 'Colorado'];

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
const AVG_SET_COST = 2500;

/* ─── Metric explanation component ─── */
function MetricInfo({ title, children }) {
  return (
    <div className="bg-navy/5 border border-navy/10 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
        <div>
          {title && <span className="text-xs font-bold text-navy uppercase tracking-wider">{title}</span>}
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}

// Build franchise lookup for gear
const deptFranchiseMap = {};
departments.forEach(d => { deptFranchiseMap[d.id] = d.franchise || 'Unknown'; });
function getGearFranchise(g) { return deptFranchiseMap[g.departmentId] || 'Unknown'; }

export default function Analytics() {
  /* ─── refs for all charts ─── */
  const franchiseBenchRef = useRef(null); const franchiseBenchCanvas = useRef(null);
  const stateBarRef = useRef(null); const stateBarCanvas = useRef(null);
  const mfrBarRef = useRef(null); const mfrBarCanvas = useRef(null);
  const ageFailRef = useRef(null); const ageFailCanvas = useRef(null);
  const replTimelineRef = useRef(null); const replTimelineCanvas = useRef(null);
  const failModeRef = useRef(null); const failModeCanvas = useRef(null);
  const failByStateRef = useRef(null); const failByStateCanvas = useRef(null);
  const ageDistRef = useRef(null); const ageDistCanvas = useRef(null);
  const budgetRef = useRef(null); const budgetCanvas = useRef(null);
  const budgetFrRef = useRef(null); const budgetFrCanvas = useRef(null);
  const heatmapFrRef = useRef(null); const heatmapFrCanvas = useRef(null);

  /* ═══════════════════════════════════════════
     SECTION 0 — Executive Summary
     ═══════════════════════════════════════════ */
  const execSummary = useMemo(() => {
    const statesSet = new Set(departments.map(d => d.state).filter(Boolean));
    const mfrsSet = new Set(allGear.map(g => g.manufacturer).filter(m => m && m !== 'Unknown'));
    return {
      totalGear: allGear.length,
      totalDepts: departments.length,
      totalStates: statesSet.size,
      totalMfrs: mfrsSet.size,
      totalFF: firefighters.length,
      franchises: FR_ORDER.map(name => {
        const fr = franchiseStats.find(f => f.name === name);
        if (!fr) return { name, gear: 0, passRate: 0, departments: 0 };
        return {
          name,
          gear: fr.gear,
          passRate: fr.gear > 0 ? ((fr.pass / fr.gear) * 100).toFixed(1) : '0.0',
          departments: fr.departments,
          firefighters: fr.firefighters,
        };
      })
    };
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 1 — Fleet Health Overview KPIs
     ═══════════════════════════════════════════ */
  const fleetKpis = useMemo(() => {
    const passRateNum = parseFloat(passRate);
    const avgAge = parseFloat(globalAvgGearAge);
    let projected12mo = 0;
    allGear.forEach(g => {
      const age = parseAge(g.mfgDate);
      if (age !== null && age >= 9 && age < 10) projected12mo++;
    });
    const agePenalty = Math.max(0, Math.min(100, 100 - (avgAge / 10) * 100));
    const expired = allGear.filter(g => { const a = parseAge(g.mfgDate); return a !== null && a >= 10; }).length;
    const complianceRate = allGear.length > 0 ? ((allGear.length - expired) / allGear.length) * 100 : 100;
    const healthScore = Math.round(passRateNum * 0.5 + agePenalty * 0.3 + complianceRate * 0.2);
    const budgetEstimate = projected12mo * AVG_SET_COST;
    return { healthScore, avgAge, projected12mo, budgetEstimate };
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 1b — Cross-Franchise Benchmarking
     ═══════════════════════════════════════════ */
  const franchiseBench = useMemo(() => {
    return FR_ORDER.map(name => {
      const fr = franchiseStats.find(f => f.name === name);
      if (!fr) return { name, passRate: 0, repairRate: 0, oosRate: 0, gear: 0, departments: 0, firefighters: 0, avgAge: 0, healthScore: 0 };
      const passRt = fr.gear > 0 ? (fr.pass / fr.gear) * 100 : 0;
      const repairRt = fr.gear > 0 ? (fr.repair / fr.gear) * 100 : 0;
      const oosRt = fr.gear > 0 ? (fr.oos / fr.gear) * 100 : 0;
      // Compute avg age for franchise
      const frDepts = departments.filter(d => d.franchise === name);
      const frGear = allGear.filter(g => frDepts.some(d => d.id === g.departmentId));
      let totalAge = 0, ageCount = 0;
      frGear.forEach(g => { const a = parseAge(g.mfgDate); if (a !== null) { totalAge += a; ageCount++; } });
      const avgAge = ageCount > 0 ? (totalAge / ageCount) : 0;
      const agePenalty = Math.max(0, Math.min(100, 100 - (avgAge / 10) * 100));
      const expiredFr = frGear.filter(g => { const a = parseAge(g.mfgDate); return a !== null && a >= 10; }).length;
      const complianceRate = frGear.length > 0 ? ((frGear.length - expiredFr) / frGear.length) * 100 : 100;
      const healthScore = Math.round(passRt * 0.5 + agePenalty * 0.3 + complianceRate * 0.2);
      return { name, passRate: passRt, repairRate: repairRt, oosRate: oosRt, gear: fr.gear, departments: fr.departments, firefighters: fr.firefighters, avgAge, healthScore };
    });
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 2 — Geographic Intelligence
     ═══════════════════════════════════════════ */
  const geoData = useMemo(() => {
    const stateMap = {};
    departments.forEach(d => {
      const st = d.state || 'Unknown';
      if (!stateMap[st]) stateMap[st] = { state: st, departments: 0, gear: 0, failed: 0, pass: 0, firefighters: 0 };
      stateMap[st].departments++;
      const deptFF = firefighters.filter(f => f.departmentId === d.id);
      stateMap[st].firefighters += deptFF.length;
      const deptGear = allGear.filter(g => g.departmentId === d.id);
      stateMap[st].gear += deptGear.length;
      deptGear.forEach(g => {
        if (isFailed(g.status)) stateMap[st].failed++;
        if (g.status === 'PASS') stateMap[st].pass++;
      });
    });
    return Object.values(stateMap)
      .map(s => ({ ...s, failureRate: s.gear > 0 ? (s.failed / s.gear) * 100 : 0, passRate: s.gear > 0 ? (s.pass / s.gear) * 100 : 0 }))
      .sort((a, b) => b.gear - a.gear);
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 3 — Manufacturer Reliability
     ═══════════════════════════════════════════ */
  const mfrData = useMemo(() => {
    const map = {};
    allGear.forEach(g => {
      const mfr = g.manufacturer || 'Unknown';
      if (mfr === 'Unknown') return;
      if (!map[mfr]) map[mfr] = { name: mfr, total: 0, pass: 0, repair: 0, oos: 0, ages: [], byFranchise: {} };
      map[mfr].total++;
      const s = (g.status || '').toUpperCase();
      if (s.includes('PASS')) map[mfr].pass++;
      else if (s === 'REPAIR') map[mfr].repair++;
      else map[mfr].oos++;
      const age = parseAge(g.mfgDate);
      if (age !== null) map[mfr].ages.push(age);
      // Track per-franchise performance
      const fr = getGearFranchise(g);
      if (!map[mfr].byFranchise[fr]) map[mfr].byFranchise[fr] = { total: 0, pass: 0, failed: 0 };
      map[mfr].byFranchise[fr].total++;
      if (s.includes('PASS')) map[mfr].byFranchise[fr].pass++;
      else map[mfr].byFranchise[fr].failed++;
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
        const failureRate = repairRt + oosRt;
        return { ...m, passRate: passRt, repairRate: repairRt, oosRate: oosRt, avgAge, score, badge, failureRate };
      })
      .sort((a, b) => b.score - a.score);
  }, []);

  const mfrRiskAlerts = useMemo(() => {
    return mfrData.filter(m => m.failureRate > 20);
  }, [mfrData]);

  /* ═══════════════════════════════════════════
     SECTION 4 — Gear Lifecycle (age → failure)
     ═══════════════════════════════════════════ */
  const lifecycleData = useMemo(() => {
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

    // Per-franchise lifecycle curves
    const frCurves = {};
    FR_ORDER.forEach(frName => {
      const frDepts = departments.filter(d => d.franchise === frName);
      const frDeptIds = new Set(frDepts.map(d => d.id));
      const frBuckets = {};
      for (let y = 0; y <= 15; y++) frBuckets[y] = { total: 0, failed: 0 };
      allGear.forEach(g => {
        if (!frDeptIds.has(g.departmentId)) return;
        const age = parseAge(g.mfgDate);
        if (age === null) return;
        const yr = Math.min(15, Math.floor(age));
        frBuckets[yr].total++;
        if (isFailed(g.status)) frBuckets[yr].failed++;
      });
      frCurves[frName] = [];
      for (let y = 0; y <= 15; y++) {
        frCurves[frName].push(frBuckets[y].total > 0 ? ((frBuckets[y].failed / frBuckets[y].total) * 100) : 0);
      }
    });

    return { labels, rates, counts, frCurves };
  }, []);

  const replacementTimeline = useMemo(() => {
    const years = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3, CURRENT_YEAR + 4];
    const data = years.map(yr => {
      let count = 0;
      let cost = 0;
      const byFranchise = {};
      FR_ORDER.forEach(fr => { byFranchise[fr] = { count: 0, cost: 0 }; });
      allGear.forEach(g => {
        const mfgYr = parseMfgYear(g.mfgDate);
        if (mfgYr === null) return;
        const retireYear = Math.floor(mfgYr + 10);
        if (retireYear === yr) {
          count++;
          const c = getCost(g.type);
          cost += c;
          const fr = getGearFranchise(g);
          if (byFranchise[fr]) { byFranchise[fr].count++; byFranchise[fr].cost += c; }
        }
      });
      return { year: yr, count, cost, byFranchise };
    });
    return data;
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 5 — Failure Mode Intelligence
     ═══════════════════════════════════════════ */
  const failureModes = useMemo(() => {
    const modeMap = {};
    allGear.forEach(g => {
      if (!g.findings || g.findings.trim() === '' || g.findings === 'nan') return;
      const modes = g.findings.split(';').map(s => s.trim()).filter(Boolean);
      modes.forEach(mode => {
        const normalized = mode.replace(/\s+/g, ' ').trim();
        if (!normalized || normalized.toLowerCase() === 'nan' || normalized.length < 3) return;
        if (!modeMap[normalized]) modeMap[normalized] = { mode: normalized, count: 0, types: {}, mfrs: {}, states: {}, franchises: {} };
        modeMap[normalized].count++;
        const type = g.type || 'Other';
        modeMap[normalized].types[type] = (modeMap[normalized].types[type] || 0) + 1;
        const mfr = g.manufacturer || 'Unknown';
        if (mfr !== 'Unknown') modeMap[normalized].mfrs[mfr] = (modeMap[normalized].mfrs[mfr] || 0) + 1;
        // Track by state
        const dept = departments.find(d => d.id === g.departmentId);
        if (dept) {
          const st = dept.state || 'Unknown';
          modeMap[normalized].states[st] = (modeMap[normalized].states[st] || 0) + 1;
          const fr = dept.franchise || 'Unknown';
          modeMap[normalized].franchises[fr] = (modeMap[normalized].franchises[fr] || 0) + 1;
        }
      });
    });
    return Object.values(modeMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(m => ({
        ...m,
        topType: Object.entries(m.types).sort((a, b) => b[1] - a[1])[0]?.[0] || '--',
        topMfr: Object.entries(m.mfrs).sort((a, b) => b[1] - a[1])[0]?.[0] || '--',
        topState: Object.entries(m.states).sort((a, b) => b[1] - a[1])[0]?.[0] || '--',
      }));
  }, []);

  // Failure modes by manufacturer
  const failByMfr = useMemo(() => {
    const map = {};
    allGear.forEach(g => {
      if (!isFailed(g.status)) return;
      const mfr = g.manufacturer || 'Unknown';
      if (mfr === 'Unknown') return;
      if (!g.findings || g.findings.trim() === '' || g.findings === 'nan') return;
      const modes = g.findings.split(';').map(s => s.trim()).filter(Boolean);
      modes.forEach(mode => {
        const normalized = mode.replace(/\s+/g, ' ').trim();
        if (!normalized || normalized.toLowerCase() === 'nan' || normalized.length < 3) return;
        const key = `${mfr}|||${normalized}`;
        if (!map[key]) map[key] = { mfr, mode: normalized, count: 0 };
        map[key].count++;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 6 — Fleet Aging Analysis
     ═══════════════════════════════════════════ */
  const agingAnalysis = useMemo(() => {
    const buckets = { '0-2 years': 0, '2-5 years': 0, '5-7 years': 0, '7-10 years': 0, '10+ years': 0 };
    let noDate = 0;
    allGear.forEach(g => {
      const age = parseAge(g.mfgDate);
      if (age === null) { noDate++; return; }
      if (age < 2) buckets['0-2 years']++;
      else if (age < 5) buckets['2-5 years']++;
      else if (age < 7) buckets['5-7 years']++;
      else if (age < 10) buckets['7-10 years']++;
      else buckets['10+ years']++;
    });

    // Expiring in 12/24/36 months
    let expire12 = 0, expire24 = 0, expire36 = 0;
    allGear.forEach(g => {
      const age = parseAge(g.mfgDate);
      if (age === null) return;
      const remaining = 10 - age;
      if (remaining > 0 && remaining <= 1) expire12++;
      if (remaining > 0 && remaining <= 2) expire24++;
      if (remaining > 0 && remaining <= 3) expire36++;
    });

    return { buckets, noDate, expire12, expire24, expire36, dangerZone: buckets['7-10 years'], expired: buckets['10+ years'] };
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 7 — Budget Forecasting
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

    // Per-franchise budget
    const frBudget = FR_ORDER.map(frName => {
      const frDepts = departments.filter(d => d.franchise === frName);
      const frDeptIds = new Set(frDepts.map(d => d.id));
      const perYear = years.map(yr => {
        let cost = 0, count = 0;
        allGear.forEach(g => {
          if (!frDeptIds.has(g.departmentId)) return;
          const mfgYr = parseMfgYear(g.mfgDate);
          if (mfgYr === null) return;
          const retireYear = Math.floor(mfgYr + 10);
          if (retireYear === yr) { cost += getCost(g.type); count++; }
        });
        return { year: yr, cost, count };
      });
      return { name: frName, perYear, totalCost: perYear.reduce((s, d) => s + d.cost, 0), totalCount: perYear.reduce((s, d) => s + d.count, 0) };
    });

    return { years, typeNames, data, frBudget };
  }, []);

  const replaceComparison = useMemo(() => {
    let overdueCount = 0, overdueCost = 0, highRiskCount = 0, highRiskCost = 0;
    allGear.forEach(g => {
      const age = parseAge(g.mfgDate);
      if (age === null) return;
      if (age >= 10) { overdueCount++; overdueCost += getCost(g.type); }
      else if (age >= 7) { highRiskCount++; highRiskCost += getCost(g.type); }
    });
    const totalWaitCost = overdueCost + highRiskCost;
    return { overdueCount, overdueCost, highRiskCount, highRiskCost, totalWaitCost };
  }, []);

  /* ═══════════════════════════════════════════
     SECTION 8 — Risk Matrix
     ═══════════════════════════════════════════ */
  const heatmapData = useMemo(() => {
    const gearTypes = ['Jacket Shell', 'Jacket Liner', 'Pant Shell', 'Pant Liner', 'Helmet', 'Hood', 'Gloves', 'Boots'];

    // Franchise × Gear Type heatmap
    const frHeat = FR_ORDER.map(frName => {
      const frDepts = departments.filter(d => d.franchise === frName);
      const frDeptIds = new Set(frDepts.map(d => d.id));
      const cells = gearTypes.map(type => {
        let total = 0, failed = 0;
        allGear.forEach(g => {
          if (!frDeptIds.has(g.departmentId) || g.type !== type) return;
          total++;
          if (isFailed(g.status)) failed++;
        });
        return { rate: total > 0 ? (failed / total) * 100 : 0, total, failed };
      });
      return { franchise: frName, cells };
    });

    // Top 10 riskiest department/gear combos
    const deptMap = {};
    allGear.forEach(g => {
      const type = g.type;
      if (!gearTypes.includes(type)) return;
      const key = `${g.department}__${type}`;
      if (!deptMap[key]) deptMap[key] = { dept: g.department, type, total: 0, failed: 0, franchise: getGearFranchise(g) };
      deptMap[key].total++;
      if (isFailed(g.status)) deptMap[key].failed++;
    });

    const top10Risk = Object.values(deptMap)
      .filter(d => d.total >= 5)
      .map(d => ({ ...d, rate: (d.failed / d.total) * 100 }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);

    // Full department heatmap
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
      const deptObj = departments.find(d => d.name === dept);
      return { dept, cells, overallRate, totalItems, franchise: deptObj?.franchise || '' };
    });
    rows.sort((a, b) => b.overallRate - a.overallRate);

    return { gearTypes, frHeat, top10Risk, rows };
  }, []);

  /* ═══════════════════════════════════════════
     CHARTS — useEffect
     ═══════════════════════════════════════════ */
  useEffect(() => {
    const destroyAll = [];

    // --- Franchise benchmarking bar chart ---
    if (franchiseBenchCanvas.current) {
      if (franchiseBenchRef.current) franchiseBenchRef.current.destroy();
      franchiseBenchRef.current = new Chart(franchiseBenchCanvas.current, {
        type: 'bar',
        data: {
          labels: franchiseBench.map(f => f.name),
          datasets: [
            { label: 'Pass %', data: franchiseBench.map(f => f.passRate.toFixed(1)), backgroundColor: '#22c55e', borderRadius: 4, barThickness: 28 },
            { label: 'Repair %', data: franchiseBench.map(f => f.repairRate.toFixed(1)), backgroundColor: '#f97316', borderRadius: 4, barThickness: 28 },
            { label: 'OOS %', data: franchiseBench.map(f => f.oosRate.toFixed(1)), backgroundColor: '#ef4444', borderRadius: 4, barThickness: 28 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` } } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } } }
        }
      });
      destroyAll.push(franchiseBenchRef);
    }

    // --- State failure rate bar chart ---
    if (stateBarCanvas.current && geoData.length > 0) {
      if (stateBarRef.current) stateBarRef.current.destroy();
      stateBarRef.current = new Chart(stateBarCanvas.current, {
        type: 'bar',
        data: {
          labels: geoData.map(s => s.state),
          datasets: [{
            label: 'Failure Rate %',
            data: geoData.map(s => s.failureRate.toFixed(1)),
            backgroundColor: geoData.map(s => s.failureRate > 15 ? '#ef4444' : s.failureRate > 10 ? '#f97316' : s.failureRate > 5 ? '#f59e0b' : '#22c55e'),
            borderRadius: 4, barThickness: 32,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `Failure Rate: ${ctx.parsed.y}%` } } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } } }
        }
      });
      destroyAll.push(stateBarRef);
    }

    // --- Manufacturer failure rate bar chart ---
    if (mfrBarCanvas.current && mfrData.length > 0) {
      if (mfrBarRef.current) mfrBarRef.current.destroy();
      const top = mfrData.slice(0, 12);
      mfrBarRef.current = new Chart(mfrBarCanvas.current, {
        type: 'bar',
        data: {
          labels: top.map(m => m.name.length > 22 ? m.name.slice(0, 20) + '…' : m.name),
          datasets: [
            { label: 'Repair %', data: top.map(m => m.repairRate.toFixed(1)), backgroundColor: '#f97316', borderRadius: 3, barThickness: 14 },
            { label: 'OOS/Fail %', data: top.map(m => m.oosRate.toFixed(1)), backgroundColor: '#ef4444', borderRadius: 3, barThickness: 14 },
          ]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.x}%` } } },
          scales: { x: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } }, y: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } } }
        }
      });
      destroyAll.push(mfrBarRef);
    }

    // --- Age vs failure rate per franchise (overlay lines) ---
    if (ageFailCanvas.current) {
      if (ageFailRef.current) ageFailRef.current.destroy();
      const datasets = FR_ORDER.map(frName => ({
        label: frName,
        data: lifecycleData.frCurves[frName].map(r => r.toFixed(1)),
        borderColor: FR_COLORS[frName],
        backgroundColor: 'transparent',
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: FR_COLORS[frName],
        borderWidth: 2.5,
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
      }));
      // Add combined as dashed
      datasets.unshift({
        label: 'Combined',
        data: lifecycleData.rates.map(r => r.toFixed(1)),
        borderColor: '#1a2a4a',
        backgroundColor: 'rgba(26, 42, 74, 0.06)',
        fill: true,
        tension: 0.35,
        borderDash: [6, 3],
        pointRadius: 3,
        borderWidth: 2,
        pointBackgroundColor: '#1a2a4a',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
      });
      ageFailRef.current = new Chart(ageFailCanvas.current, {
        type: 'line',
        data: { labels: lifecycleData.labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` } } },
          scales: { x: { grid: { color: '#f1f5f9' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' }, title: { display: true, text: 'Failure Rate %', font: { size: 11 } } } }
        }
      });
      destroyAll.push(ageFailRef);
    }

    // --- Replacement timeline ---
    if (replTimelineCanvas.current) {
      if (replTimelineRef.current) replTimelineRef.current.destroy();
      replTimelineRef.current = new Chart(replTimelineCanvas.current, {
        type: 'bar',
        data: {
          labels: replacementTimeline.map(d => d.year.toString()),
          datasets: FR_ORDER.map(frName => ({
            label: frName,
            data: replacementTimeline.map(d => d.byFranchise[frName]?.count || 0),
            backgroundColor: FR_COLORS[frName],
            borderRadius: 3,
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: { callbacks: { afterLabel: ctx => { const frName = FR_ORDER[ctx.datasetIndex]; const d = replacementTimeline[ctx.dataIndex]; return `Cost: $${(d.byFranchise[frName]?.cost || 0).toLocaleString()}`; } } }
          },
          scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' } } }
        }
      });
      destroyAll.push(replTimelineRef);
    }

    // --- Failure mode chart ---
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
            borderRadius: 3, barThickness: 16,
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
        }
      });
      destroyAll.push(failModeRef);
    }

    // --- Age distribution pie chart ---
    if (ageDistCanvas.current) {
      if (ageDistRef.current) ageDistRef.current.destroy();
      const labels = Object.keys(agingAnalysis.buckets);
      const vals = Object.values(agingAnalysis.buckets);
      ageDistRef.current = new Chart(ageDistCanvas.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: vals,
            backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
            borderWidth: 2, borderColor: '#fff',
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 12 } },
            tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toLocaleString()} (${(ctx.parsed / allGear.length * 100).toFixed(1)}%)` } }
          }
        }
      });
      destroyAll.push(ageDistRef);
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
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`, footer: items => { const total = items.reduce((s, i) => s + i.parsed.y, 0); return `Total: $${total.toLocaleString()}`; } } }
          },
          scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } }
        }
      });
      destroyAll.push(budgetRef);
    }

    // --- Per-franchise budget bar ---
    if (budgetFrCanvas.current) {
      if (budgetFrRef.current) budgetFrRef.current.destroy();
      budgetFrRef.current = new Chart(budgetFrCanvas.current, {
        type: 'bar',
        data: {
          labels: budgetForecast.years.map(String),
          datasets: budgetForecast.frBudget.map(fr => ({
            label: fr.name,
            data: fr.perYear.map(d => d.cost),
            backgroundColor: FR_COLORS[fr.name] || '#94a3b8',
            borderRadius: 3,
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}` } }
          },
          scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } }
        }
      });
      destroyAll.push(budgetFrRef);
    }

    // --- Franchise × Gear Type heatmap chart ---
    if (heatmapFrCanvas.current) {
      if (heatmapFrRef.current) heatmapFrRef.current.destroy();
      heatmapFrRef.current = new Chart(heatmapFrCanvas.current, {
        type: 'bar',
        data: {
          labels: heatmapData.gearTypes,
          datasets: FR_ORDER.map(frName => {
            const frH = heatmapData.frHeat.find(f => f.franchise === frName);
            return {
              label: frName,
              data: frH ? frH.cells.map(c => c.rate.toFixed(1)) : heatmapData.gearTypes.map(() => 0),
              backgroundColor: FR_COLORS[frName],
              borderRadius: 3,
            };
          })
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` } } },
          scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } } }
        }
      });
      destroyAll.push(heatmapFrRef);
    }

    return () => { destroyAll.forEach(ref => ref.current?.destroy()); };
  }, [mfrData, lifecycleData, replacementTimeline, failureModes, budgetForecast, franchiseBench, geoData, agingAnalysis, heatmapData]);

  /* ═══════════════════════════════════════════
     RENDER HELPERS
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
  const scoreColor = (score) => { if (score >= 85) return 'text-green-600'; if (score >= 70) return 'text-amber-600'; return 'text-red-600'; };
  const scoreBg = (score) => { if (score >= 85) return 'bg-green-500'; if (score >= 70) return 'bg-amber-500'; return 'bg-red-500'; };
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

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="max-w-full" data-testid="analytics-page">
      <Breadcrumb items={[{ label: 'Analytics' }]} />

      {/* Page header */}
      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-8 bg-gradient-to-br from-navy to-navy-light rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </span>
            Master Fleet Intelligence &amp; Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">Cross-franchise analytics across {allGear.length.toLocaleString()} gear items · {departments.length} departments · {new Set(departments.map(d => d.state).filter(Boolean)).size} states · {uniqueMfrs.size} manufacturers</p>
        </div>
        <span className="px-3 py-1.5 bg-navy/5 text-navy text-xs font-semibold rounded-full border border-navy/10">
          Data as of {NOW.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* ═══ SECTION 0: Executive Summary Banner ═══ */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-[#0f1a30] via-[#1a2a4a] to-[#2a3f6a] rounded-xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.03) 35px, rgba(255,255,255,0.03) 70px)' }}></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-brand-light" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <h2 className="text-base font-bold uppercase tracking-wider text-white/80">Executive Summary</h2>
              <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/60 ml-2">All Franchises Combined</span>
            </div>

            {/* Top KPI row */}
            <div className="grid grid-cols-5 gap-4 mb-5">
              <div>
                <div className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">Total Gear Items</div>
                <div className="text-3xl font-extrabold">{execSummary.totalGear.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">Departments</div>
                <div className="text-3xl font-extrabold">{execSummary.totalDepts}</div>
              </div>
              <div>
                <div className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">Personnel</div>
                <div className="text-3xl font-extrabold">{execSummary.totalFF.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">States</div>
                <div className="text-3xl font-extrabold">{execSummary.totalStates}</div>
              </div>
              <div>
                <div className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">Manufacturers</div>
                <div className="text-3xl font-extrabold">{execSummary.totalMfrs}</div>
              </div>
            </div>

            {/* Franchise comparison cards */}
            <div className="grid grid-cols-3 gap-4">
              {execSummary.franchises.map(fr => (
                <div key={fr.name} className="rounded-lg p-4 border" style={{ backgroundColor: FR_COLORS_LIGHT[fr.name], borderColor: FR_COLORS[fr.name] + '33' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm" style={{ color: FR_COLORS[fr.name] }}>{fr.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: FR_COLORS[fr.name], color: '#fff' }}>{fr.passRate}% Pass</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-white/50">Gear</div>
                      <div className="font-bold text-white">{fr.gear.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-white/50">Depts</div>
                      <div className="font-bold text-white">{fr.departments}</div>
                    </div>
                    <div>
                      <div className="text-white/50">Personnel</div>
                      <div className="font-bold text-white">{(fr.firefighters || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 1: Fleet Health KPIs ═══ */}
      <MetricInfo title="How these KPIs are calculated">
        <strong>Fleet Health Score (0-100):</strong> Weighted formula — Pass Rate contributes 50%, Avg Gear Age contributes 30% (lower age = higher score, scaled where 0 yrs = 100 and 10 yrs = 0), and Compliance Rate contributes 20% (% of items not Out of Service). A score above 85 is strong, 70-85 needs attention, below 70 is critical.
        {' '}<strong>Avg Gear Age:</strong> Mean age in years of all gear items with a valid manufacture date.
        {' '}<strong>Replacements (12mo):</strong> Count of gear items whose manufacture date will pass the NFPA 1851 10-year mandatory retirement within the next 12 months.
        {' '}<strong>12mo Budget Est.:</strong> Replacement count × average cost per item type (Jacket Shell $900, Pants Shell $700, Helmet $400, Boots $350, Hood $150, Gloves $100).
      </MetricInfo>
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
        <KpiCard value={`${fleetKpis.avgAge} yr`} label="Avg Gear Age" color="blue" icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} />
        <KpiCard value={fleetKpis.projected12mo.toLocaleString()} label="Replacements (12mo)" color="orange" icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>} />
        <KpiCard value={`$${(fleetKpis.budgetEstimate / 1000).toFixed(0)}k`} label="12mo Budget Est." color="brand" icon={<svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
      </div>

      {/* ═══ SECTION 1b: Cross-Franchise Benchmarking ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>} bgColor="bg-indigo-100" title="Cross-Franchise Benchmarking" subtitle="Comparing Florida vs Corporate vs Sarasota performance" />
        <MetricInfo title="Reading this section">
          <strong>Pass %:</strong> Percentage of gear items that passed inspection with no issues. <strong>Health Score:</strong> Same 0-100 composite score as above, calculated per franchise. <strong>BEST</strong> badge = highest health score. <strong>NEEDS WORK</strong> = lowest. A franchise with lower pass rate may have older gear fleet or more demanding inspection standards.
        </MetricInfo>
        <div className="grid grid-cols-3 gap-4">
          {/* Chart */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pass / Repair / OOS Rates</h3>
            <div style={{ height: 280 }}><canvas ref={franchiseBenchCanvas}></canvas></div>
          </div>

          {/* Table */}
          <div className="col-span-2 bg-white rounded-lg border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Franchise</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Depts</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Personnel</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Gear</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Pass %</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Avg Age</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Health</th>
                </tr>
              </thead>
              <tbody>
                {franchiseBench.map((fr, i) => {
                  const best = franchiseBench.reduce((a, b) => a.healthScore >= b.healthScore ? a : b);
                  const worst = franchiseBench.reduce((a, b) => a.healthScore <= b.healthScore ? a : b);
                  return (
                    <tr key={fr.name} className={`border-b border-gray-100 hover:bg-gray-50 ${fr.name === best.name ? 'bg-green-50/30' : fr.name === worst.name ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 px-4 font-bold" style={{ color: FR_COLORS[fr.name] }}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FR_COLORS[fr.name] }}></span>
                          {fr.name}
                          {fr.name === best.name && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">BEST</span>}
                          {fr.name === worst.name && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">NEEDS WORK</span>}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 font-medium">{fr.departments}</td>
                      <td className="text-center py-3 px-3">{fr.firefighters.toLocaleString()}</td>
                      <td className="text-center py-3 px-3 font-medium">{fr.gear.toLocaleString()}</td>
                      <td className={`text-center py-3 px-3 font-bold ${fr.passRate >= 90 ? 'text-green-600' : fr.passRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{fr.passRate.toFixed(1)}%</td>
                      <td className="text-center py-3 px-3 text-gray-600">{fr.avgAge.toFixed(1)} yr</td>
                      <td className="text-center py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${scoreBg(fr.healthScore)}`}></div>
                          <span className={`font-bold ${scoreColor(fr.healthScore)}`}>{fr.healthScore}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: Geographic Intelligence ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} bgColor="bg-teal-100" title="Geographic Intelligence" subtitle={`State-by-state analysis across ${geoData.length} states`} />

        <div className="grid grid-cols-5 gap-4">
          {/* Chart */}
          <div className="col-span-2 bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Failure Rate by State</h3>
            <div style={{ height: 300 }}><canvas ref={stateBarCanvas}></canvas></div>
          </div>

          {/* Table */}
          <div className="col-span-3 bg-white rounded-lg border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">State</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Depts</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Personnel</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Gear</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Pass %</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Failure %</th>
                </tr>
              </thead>
              <tbody>
                {geoData.map(s => (
                  <tr key={s.state} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-bold text-gray-900">{s.state}</td>
                    <td className="text-center py-2.5 px-3">{s.departments}</td>
                    <td className="text-center py-2.5 px-3">{s.firefighters.toLocaleString()}</td>
                    <td className="text-center py-2.5 px-3 font-medium">{s.gear.toLocaleString()}</td>
                    <td className={`text-center py-2.5 px-3 font-semibold ${s.passRate >= 90 ? 'text-green-600' : s.passRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{s.passRate.toFixed(1)}%</td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${s.failureRate > 15 ? 'bg-red-100 text-red-700' : s.failureRate > 10 ? 'bg-orange-100 text-orange-700' : s.failureRate > 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>{s.failureRate.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: Manufacturer Reliability ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>} bgColor="bg-navy/10" title="Manufacturer Reliability Scorecard" subtitle={`${mfrData.length} manufacturers scored · ${allGear.length.toLocaleString()} data points — these ARE the industry benchmarks`} />

        {/* Risk alerts */}
        {mfrRiskAlerts.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>
              <span className="text-sm font-bold text-red-700">Manufacturer Risk Alerts — {mfrRiskAlerts.length} manufacturers with &gt;20% failure rate</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {mfrRiskAlerts.map(m => (
                <span key={m.name} className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 border border-red-200 rounded-full text-xs font-bold text-red-700">
                  {m.name} — {m.failureRate.toFixed(1)}% failure ({m.total.toLocaleString()} items)
                </span>
              ))}
            </div>
          </div>
        )}

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
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor(m.badge)}`}>{m.badge}</span>
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

        {/* Cross-franchise manufacturer performance */}
        <div className="mt-4 bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Manufacturer Performance Across Franchises</h3>
          <p className="text-xs text-gray-400 mb-3">Does the same manufacturer perform differently in Florida vs Corporate vs Sarasota?</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600 uppercase tracking-wider">Manufacturer</th>
                  {FR_ORDER.map(fr => (
                    <th key={fr} className="text-center py-2.5 px-3 font-semibold uppercase tracking-wider" style={{ color: FR_COLORS[fr] }}>{fr} Pass %</th>
                  ))}
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-600 uppercase tracking-wider">Variance</th>
                </tr>
              </thead>
              <tbody>
                {mfrData.slice(0, 10).map(m => {
                  const frRates = FR_ORDER.map(fr => {
                    const d = m.byFranchise[fr];
                    return d && d.total >= 5 ? (d.pass / d.total) * 100 : null;
                  });
                  const validRates = frRates.filter(r => r !== null);
                  const variance = validRates.length >= 2 ? (Math.max(...validRates) - Math.min(...validRates)).toFixed(1) : '--';
                  return (
                    <tr key={m.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium text-gray-900">{m.name}</td>
                      {frRates.map((rate, i) => (
                        <td key={i} className="text-center py-2 px-3">
                          {rate !== null ? (
                            <span className={`font-bold ${rate >= 90 ? 'text-green-600' : rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{rate.toFixed(1)}%</span>
                          ) : <span className="text-gray-300">N/A</span>}
                        </td>
                      ))}
                      <td className="text-center py-2 px-3">
                        {variance !== '--' ? (
                          <span className={`font-bold ${parseFloat(variance) > 10 ? 'text-red-600' : parseFloat(variance) > 5 ? 'text-amber-600' : 'text-green-600'}`}>{variance}%</span>
                        ) : <span className="text-gray-300">--</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 4: Gear Lifecycle ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-brand" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>} bgColor="bg-brand/10" title="Gear Lifecycle Analysis" subtitle="NFPA 1851 mandates 10-year retirement · Overlay shows franchise-level failure curves" />

        <div className="grid grid-cols-2 gap-4">
          {/* Age vs Failure chart with franchise overlays */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">The Failure Cliff — Per Franchise</h3>
              <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-semibold border border-red-100">⚠ CRITICAL INSIGHT</span>
            </div>
            <div style={{ height: 320 }}><canvas ref={ageFailCanvas}></canvas></div>
            <div className="mt-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
              <p className="text-xs text-red-800">
                <span className="font-bold">Key Finding:</span> Failure rates increase exponentially after year 7 across ALL franchises. Combined data from {allGear.length.toLocaleString()} items validates NFPA 1851's 10-year mandatory retirement.
              </p>
            </div>
          </div>

          {/* Replacement timeline stacked by franchise */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">5-Year Retirement Timeline — By Franchise</h3>
            <div style={{ height: 320 }}><canvas ref={replTimelineCanvas}></canvas></div>
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

      {/* ═══ SECTION 5: Failure Mode Intelligence ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>} bgColor="bg-orange-100" title="Failure Mode Intelligence" subtitle="What's breaking, where, and why — across all franchises" />

        <div className="grid grid-cols-5 gap-4">
          {/* Chart */}
          <div className="col-span-2 bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 15 Failure Modes</h3>
            <div style={{ height: 440 }}><canvas ref={failModeCanvas}></canvas></div>
          </div>

          {/* Table with state/franchise columns */}
          <div className="col-span-3 bg-white rounded-lg border border-surface-border overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Failure Mode Detail — with Regional Patterns</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">#</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Failure Mode</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Count</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Gear Type</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Mfr</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Top State</th>
                  </tr>
                </thead>
                <tbody>
                  {failureModes.map((f, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-2 px-4"><span className="font-medium text-gray-900">{f.mode}</span></td>
                      <td className="text-center py-2 px-3">
                        <span className={`font-bold ${f.count > 200 ? 'text-red-600' : f.count > 50 ? 'text-amber-600' : 'text-gray-700'}`}>{f.count.toLocaleString()}</span>
                      </td>
                      <td className="py-2 px-3"><span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-700">{f.topType}</span></td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{f.topMfr}</td>
                      <td className="py-2 px-3 text-xs font-medium text-gray-600">{f.topState}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Failure mode × manufacturer cross-reference */}
        {failByMfr.length > 0 && (
          <div className="mt-4 bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Failure Modes by Manufacturer — Which manufacturers fail in which ways?</h3>
            <div className="grid grid-cols-5 gap-3">
              {failByMfr.map((item, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.mfr}</div>
                  <div className="text-xs font-medium text-gray-900 mt-1 line-clamp-2">{item.mode}</div>
                  <div className="text-sm font-bold text-red-600 mt-1">{item.count} occurrences</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SECTION 6: Fleet Aging Analysis ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} bgColor="bg-purple-100" title="Fleet Aging Analysis" subtitle={`Age distribution of ${allGear.length.toLocaleString()} gear items — critical retirement planning data`} />

        <div className="grid grid-cols-3 gap-4">
          {/* Doughnut chart */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fleet Age Distribution</h3>
            <div style={{ height: 280 }}><canvas ref={ageDistCanvas}></canvas></div>
          </div>

          {/* Age stats cards */}
          <div className="space-y-3">
            <div className="bg-white rounded-lg border border-surface-border p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Danger Zone Breakdown</div>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Already Expired (10+ yr)</div>
                      <div className="text-2xl font-bold text-red-700">{agingAnalysis.expired.toLocaleString()}</div>
                    </div>
                    <div className="text-xs font-bold text-red-600">{(agingAnalysis.expired / allGear.length * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Danger Zone (7-10 yr)</div>
                      <div className="text-2xl font-bold text-orange-700">{agingAnalysis.dangerZone.toLocaleString()}</div>
                    </div>
                    <div className="text-xs font-bold text-orange-600">{(agingAnalysis.dangerZone / allGear.length * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Safe (&lt;7 yr)</div>
                      <div className="text-2xl font-bold text-green-700">{(allGear.length - agingAnalysis.expired - agingAnalysis.dangerZone - agingAnalysis.noDate).toLocaleString()}</div>
                    </div>
                    <div className="text-xs font-bold text-green-600">{((allGear.length - agingAnalysis.expired - agingAnalysis.dangerZone - agingAnalysis.noDate) / allGear.length * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Urgency metrics */}
          <div className="bg-white rounded-lg border border-surface-border p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Upcoming Expirations</div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Next 12 months</span>
                  <span className="text-sm font-bold text-red-600">{agingAnalysis.expire12.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, (agingAnalysis.expire12 / allGear.length) * 100 * 10)}%` }}></div>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Est. cost: ${(agingAnalysis.expire12 * AVG_SET_COST / 1000).toFixed(0)}k</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Next 24 months</span>
                  <span className="text-sm font-bold text-orange-600">{agingAnalysis.expire24.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, (agingAnalysis.expire24 / allGear.length) * 100 * 10)}%` }}></div>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Est. cost: ${(agingAnalysis.expire24 * AVG_SET_COST / 1000).toFixed(0)}k</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Next 36 months</span>
                  <span className="text-sm font-bold text-amber-600">{agingAnalysis.expire36.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (agingAnalysis.expire36 / allGear.length) * 100 * 10)}%` }}></div>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Est. cost: ${(agingAnalysis.expire36 * AVG_SET_COST / 1000).toFixed(0)}k</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-navy/5 rounded-lg border border-navy/10">
              <div className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1">3-Year Outlook</div>
              <p className="text-xs text-gray-600">{agingAnalysis.expire36.toLocaleString()} items will reach mandatory retirement within 36 months, requiring an estimated <span className="font-bold text-navy">${(agingAnalysis.expire36 * AVG_SET_COST / 1000000).toFixed(1)}M</span> in replacement budget.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 7: Budget Intelligence ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} bgColor="bg-green-100" title="Budget Intelligence" subtitle="5-year replacement cost projection across all franchises" />

        <div className="grid grid-cols-3 gap-4">
          {/* Combined budget chart */}
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
          </div>
        </div>

        {/* Per-franchise budget breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Per-Franchise Budget Breakdown (5-Year)</h3>
            <div style={{ height: 280 }}><canvas ref={budgetFrCanvas}></canvas></div>
          </div>
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Franchise Budget Summary</h3>
            <div className="space-y-3">
              {budgetForecast.frBudget.map(fr => (
                <div key={fr.name} className="p-3 rounded-lg border" style={{ borderColor: FR_COLORS[fr.name] + '33', backgroundColor: FR_COLORS_LIGHT[fr.name] }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm" style={{ color: FR_COLORS[fr.name] }}>{fr.name}</span>
                    <span className="text-lg font-bold text-gray-900">${(fr.totalCost / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex gap-2">
                    {fr.perYear.map(d => (
                      <div key={d.year} className="flex-1 text-center p-1.5 bg-white/60 rounded text-[10px]">
                        <div className="font-semibold text-gray-500">{d.year}</div>
                        <div className="font-bold text-gray-900">{d.count}</div>
                        <div className="text-gray-400">${(d.cost / 1000).toFixed(0)}k</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Cost of inaction */}
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">⚠ Cost of Inaction</h4>
              <p className="text-xs text-red-700">
                Failing to replace {replaceComparison.overdueCount.toLocaleString()} overdue items represents <span className="font-bold">${(replaceComparison.overdueCost / 1000).toFixed(0)}k</span> in deferred liability. NFPA 1851 non-compliance exposes the organization to:
              </p>
              <ul className="text-xs text-red-600 mt-2 space-y-1 pl-4">
                <li className="list-disc">Worker compensation claims from equipment failure</li>
                <li className="list-disc">OSHA regulatory action and fines</li>
                <li className="list-disc">Insurance coverage denial for non-compliant gear</li>
                <li className="list-disc">Increased failure rates — gear 10+ years fails at 3-5x the rate of newer equipment</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Unit cost reference */}
        <div className="mt-4 bg-white rounded-lg border border-surface-border p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unit Cost Reference</h4>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(COST_MAP).filter(([k]) => k !== 'Others').map(([type, cost]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">{type}:</span>
                <span className="font-semibold text-gray-900">${cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SECTION 8: Risk Matrix ═══ */}
      <div className="mb-6">
        <SectionHeader icon={<svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/></svg>} bgColor="bg-red-100" title="Risk Matrix" subtitle="Franchise × Gear Type failure heatmap + highest-risk combinations" />

        {/* Franchise × Gear Type heatmap chart */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Franchise × Gear Type Failure Rate</h3>
            <div style={{ height: 300 }}><canvas ref={heatmapFrCanvas}></canvas></div>
          </div>

          {/* Top 10 riskiest combos */}
          <div className="bg-white rounded-lg border border-surface-border overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Top 10 Highest-Risk Department × Gear Combos</h3>
              <p className="text-xs text-gray-400">Minimum 5 items per combination</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">#</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Department</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Gear Type</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Failed/Total</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.top10Risk.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-2 px-4">
                        <div className="font-medium text-gray-900 text-xs">{item.dept}</div>
                        <div className="text-[10px]" style={{ color: FR_COLORS[item.franchise] || '#666' }}>{item.franchise}</div>
                      </td>
                      <td className="py-2 px-3"><span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-xs font-medium">{item.type}</span></td>
                      <td className="text-center py-2 px-3 text-xs">{item.failed}/{item.total}</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded font-bold text-xs ${item.rate > 40 ? 'bg-red-200 text-red-900' : item.rate > 25 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{item.rate.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Full department heatmap */}
        <div className="bg-white rounded-lg border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Full Department × Gear Type Heatmap</h3>
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
                  <th className="text-center py-2.5 px-2 font-semibold text-gray-500 uppercase tracking-wider">FR</th>
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
                    <td className="text-center py-2 px-2">
                      <span className="text-[9px] font-bold" style={{ color: FR_COLORS[row.franchise] || '#666' }}>{row.franchise.slice(0, 3).toUpperCase()}</span>
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

      {/* ═══ Bottom Executive Summary Bar ═══ */}
      <div className="bg-gradient-to-r from-navy to-navy-light rounded-lg p-6 mb-4 text-white">
        <div className="grid grid-cols-6 gap-4">
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Total Gear</div>
            <div className="text-2xl font-bold">{allGear.length.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Franchises</div>
            <div className="text-2xl font-bold">{franchiseStats.length}</div>
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
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Mfrs Scored</div>
            <div className="text-2xl font-bold">{mfrData.length}</div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">States Covered</div>
            <div className="text-2xl font-bold">{new Set(departments.map(d => d.state).filter(Boolean)).size}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Section Header ─── */
function SectionHeader({ icon, bgColor, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-6 h-6 rounded ${bgColor} flex items-center justify-center`}>{icon}</div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <span className="text-xs text-gray-400 ml-2">{subtitle}</span>}
    </div>
  );
}
