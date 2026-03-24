import { useRef, useEffect, useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { allGear, uniqueMfrs } from '../dataProcessor';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function Manufacturers() {
  const topMfrChartRef = useRef(null);
  const topMfrCanvasRef = useRef(null);
  const failChartRef = useRef(null);
  const failCanvasRef = useRef(null);

  // Compute manufacturer stats
  const mfrStats = useMemo(() => {
    const map = {};
    allGear.forEach(g => {
      const mfr = g.manufacturer || 'Unknown';
      if (mfr === 'Unknown') return;
      if (!map[mfr]) {
        map[mfr] = {
          name: mfr,
          total: 0,
          pass: 0,
          repair: 0,
          oos: 0,
          expired: 0,
          departments: new Set(),
          types: {},
        };
      }
      map[mfr].total++;
      const s = g.status?.toUpperCase() || '';
      if (s.includes('PASS')) map[mfr].pass++;
      else if (s === 'REPAIR') map[mfr].repair++;
      else if (['OOS', 'OUT OF DATE', 'RECOMMEND OOS', 'FAIL'].includes(s)) map[mfr].oos++;
      else if (s === 'EXPIRED') map[mfr].expired++;

      map[mfr].departments.add(g.department);
      const type = g.type || g.name || 'Other';
      map[mfr].types[type] = (map[mfr].types[type] || 0) + 1;
    });

    return Object.values(map).map(m => ({
      ...m,
      deptCount: m.departments.size,
      departments: [...m.departments],
      passRate: m.total > 0 ? ((m.pass / m.total) * 100).toFixed(1) : '0.0',
      failRate: m.total > 0 ? (((m.repair + m.oos + m.expired) / m.total) * 100).toFixed(1) : '0.0',
      typesArr: Object.entries(m.types).sort((a, b) => b[1] - a[1]),
    })).sort((a, b) => b.total - a.total);
  }, []);

  // Top failing manufacturers (by fail count)
  const topFailing = useMemo(() => {
    return [...mfrStats]
      .map(m => ({ ...m, failCount: m.repair + m.oos + m.expired }))
      .filter(m => m.failCount > 0)
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10);
  }, [mfrStats]);

  // Total stats
  const totalItems = mfrStats.reduce((s, m) => s + m.total, 0);
  const totalFailing = mfrStats.reduce((s, m) => s + m.repair + m.oos + m.expired, 0);
  const avgPassRate = totalItems > 0
    ? ((mfrStats.reduce((s, m) => s + m.pass, 0) / totalItems) * 100).toFixed(1)
    : '0.0';

  useEffect(() => {
    // Top manufacturers by gear count
    const top10 = mfrStats.slice(0, 10);
    if (topMfrChartRef.current) topMfrChartRef.current.destroy();
    topMfrChartRef.current = new Chart(topMfrCanvasRef.current, {
      type: 'bar',
      data: {
        labels: top10.map(m => m.name.length > 20 ? m.name.slice(0, 18) + '...' : m.name),
        datasets: [{
          label: 'Gear Items',
          data: top10.map(m => m.total),
          backgroundColor: '#1a2a4a',
          borderRadius: 4,
          barThickness: 18,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          y: { grid: { display: false } }
        }
      }
    });

    // Top failing
    if (topFailing.length > 0) {
      if (failChartRef.current) failChartRef.current.destroy();
      failChartRef.current = new Chart(failCanvasRef.current, {
        type: 'bar',
        data: {
          labels: topFailing.map(m => m.name.length > 20 ? m.name.slice(0, 18) + '...' : m.name),
          datasets: [
            { label: 'Repair', data: topFailing.map(m => m.repair), backgroundColor: '#f97316', borderRadius: 4, barThickness: 14 },
            { label: 'OOS', data: topFailing.map(m => m.oos), backgroundColor: '#ef4444', borderRadius: 4, barThickness: 14 },
            { label: 'Expired', data: topFailing.map(m => m.expired), backgroundColor: '#dc2626', borderRadius: 4, barThickness: 14 },
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: {
            x: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' } },
            y: { stacked: true, grid: { display: false } }
          }
        }
      });
    }

    return () => {
      topMfrChartRef.current?.destroy();
      failChartRef.current?.destroy();
    };
  }, [mfrStats, topFailing]);

  // Table columns
  const columns = [
    { key: 'name', header: 'Manufacturer', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'total', header: 'Total Gear', render: (r) => <span className="font-bold">{r.total.toLocaleString()}</span> },
    { key: 'pass', header: 'Pass', render: (r) => <span className="text-green-600 font-medium">{r.pass.toLocaleString()}</span> },
    { key: 'repair', header: 'Repair', render: (r) => (
      <span className={`font-medium ${r.repair > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{r.repair}</span>
    )},
    { key: 'oos', header: 'OOS', render: (r) => (
      <span className={`font-medium ${r.oos > 0 ? 'text-red-600' : 'text-gray-400'}`}>{r.oos}</span>
    )},
    { key: 'expired', header: 'Expired', render: (r) => (
      <span className={`font-medium ${r.expired > 0 ? 'text-red-700' : 'text-gray-400'}`}>{r.expired}</span>
    )},
    { key: 'passRate', header: 'Pass Rate', render: (r) => {
      const pct = parseFloat(r.passRate);
      const color = pct >= 95 ? 'text-green-600' : pct >= 85 ? 'text-amber-600' : 'text-red-600';
      return <span className={`font-semibold ${color}`}>{r.passRate}%</span>;
    }},
    { key: 'deptCount', header: 'Depts', render: (r) => <span>{r.deptCount}</span> },
    { key: 'topType', header: 'Top Gear Type', render: (r) => (
      r.typesArr.length > 0 ? <span className="text-xs text-gray-600">{r.typesArr[0][0]} ({r.typesArr[0][1]})</span> : '--'
    )},
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Manufacturers' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Manufacturers</h1>
      <p className="text-gray-500 text-sm mb-6">Gear manufacturer analytics across all departments</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiCard value={uniqueMfrs.size} label="Manufacturers" color="blue"
          icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>} />
        <KpiCard value={totalItems.toLocaleString()} label="Total Gear Items" color="green"
          icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <KpiCard value={`${avgPassRate}%`} label="Avg Pass Rate" color="green"
          icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>} />
        <KpiCard value={totalFailing} label="Total Failing" color="red"
          icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>} />
        <KpiCard value={mfrStats.length > 0 ? mfrStats[0].name : '--'} label="Top Manufacturer" color="navy"
          icon={<svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gear by Manufacturer (Top 10)</h3>
          <div style={{ height: 280 }}><canvas ref={topMfrCanvasRef}></canvas></div>
        </div>
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Failure Breakdown by Manufacturer</h3>
          {topFailing.length > 0 ? (
            <div style={{ height: 280 }}><canvas ref={failCanvasRef}></canvas></div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No failures recorded</div>
          )}
        </div>
      </div>

      {/* Gear Type Breakdown per Manufacturer */}
      <div className="bg-white rounded-lg border border-surface-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Gear Type Distribution by Manufacturer</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Manufacturer</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Jacket Shell</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Jacket Liner</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Pant Shell</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Pant Liner</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Helmet</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Hood</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Gloves</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Boots</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {mfrStats.slice(0, 15).map((m) => (
                <tr key={m.name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{m.name}</td>
                  {['Jacket Shell', 'Jacket Liner', 'Pant Shell', 'Pant Liner', 'Helmet', 'Hood', 'Gloves', 'Boots'].map(type => (
                    <td key={type} className="text-center py-2 px-2 text-gray-600">
                      {m.types[type] || <span className="text-gray-300">–</span>}
                    </td>
                  ))}
                  <td className="text-center py-2 px-2 font-bold text-navy">{m.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Manufacturer Table */}
      <DataTable
        columns={columns}
        data={mfrStats}
        title={`${mfrStats.length} manufacturers`}
        searchPlaceholder="Search manufacturers..."
      />
    </div>
  );
}
