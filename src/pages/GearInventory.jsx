import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRef, useEffect, useState, useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { allGear, gearByType, gearByMfr, uniqueMfrs, globalAvgGearAge } from '../dataProcessor';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function GearInventory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter') || '';
  const [statusFilter, setStatusFilter] = useState(urlFilter);

  // Map URL filter values to actual status values
  const filteredGear = useMemo(() => {
    if (!statusFilter) return allGear;
    const filterMap = {
      'expired': (g) => g.status?.toUpperCase() === 'EXPIRED',
      'oos': (g) => ['OOS', 'OUT OF DATE', 'RECOMMEND OOS', 'FAIL'].includes(g.status?.toUpperCase()),
      'repair': (g) => g.status?.toUpperCase() === 'REPAIR',
      'pass': (g) => g.status?.toUpperCase()?.includes('PASS'),
    };
    const fn = filterMap[statusFilter];
    return fn ? allGear.filter(fn) : allGear;
  }, [statusFilter]);

  const filterLabel = { expired: 'Expired Gear', oos: 'Out of Service', repair: 'Action Required (Repair)', pass: 'Passed' };

  const typeChartRef = useRef(null);
  const mfrChartRef = useRef(null);
  const typeCanvasRef = useRef(null);
  const mfrCanvasRef = useRef(null);

  const gearTypes = Object.keys(gearByType).length;

  useEffect(() => {
    // Gear by Type
    const typeSorted = Object.entries(gearByType).sort((a, b) => b[1] - a[1]);
    if (typeChartRef.current) typeChartRef.current.destroy();
    typeChartRef.current = new Chart(typeCanvasRef.current, {
      type: 'bar',
      data: {
        labels: typeSorted.map(([k]) => k),
        datasets: [{
          label: 'Count',
          data: typeSorted.map(([, v]) => v),
          backgroundColor: '#64748b',
          borderRadius: 4,
          barThickness: 18
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
      }
    });

    // Gear by Manufacturer (top 10)
    const mfrSorted = Object.entries(gearByMfr).filter(([k]) => k && k !== 'Unknown' && k !== '').sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (mfrChartRef.current) mfrChartRef.current.destroy();
    mfrChartRef.current = new Chart(mfrCanvasRef.current, {
      type: 'bar',
      data: {
        labels: mfrSorted.map(([k]) => k.length > 20 ? k.slice(0, 20) + '...' : k),
        datasets: [{
          label: 'Count',
          data: mfrSorted.map(([, v]) => v),
          backgroundColor: '#c41e24',
          borderRadius: 4,
          barThickness: 18
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
      }
    });

    return () => { typeChartRef.current?.destroy(); mfrChartRef.current?.destroy(); };
  }, []);

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { key: 'serialNumber', header: 'Serial #', render: (r) => <span className="font-mono text-xs">{r.serialNumber || '--'}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'type', header: 'Type' },
    { key: 'manufacturer', header: 'Manufacturer' },
    { key: 'firefighterName', header: 'Assigned To' },
    { key: 'department', header: 'Department' },
    { key: 'mfgDate', header: 'MFG Date' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Gear' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Gear</h1>
      <p className="text-gray-500 text-sm mb-6">{allGear.length.toLocaleString()} gear items under live tracking</p>
      {statusFilter && (
        <div className="flex items-center gap-3 mt-3 mb-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
          <span className="text-sm font-semibold text-amber-800">Filtered: {filterLabel[statusFilter] || statusFilter}</span>
          <span className="text-sm text-amber-600">({filteredGear.length.toLocaleString()} items)</span>
          <button onClick={() => { setStatusFilter(''); navigate('/gear'); }} className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
            Clear Filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard value={allGear.length.toLocaleString()} label="Total Gear" color="blue"
          icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>} />
        <KpiCard value={gearTypes} label="Gear Types" color="green"
          icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>} />
        <KpiCard value={uniqueMfrs.size} label="Manufacturers" color="orange"
          icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83"/></svg>} />
        <KpiCard value={`${globalAvgGearAge} yrs`} label="Avg Age" color="navy"
          icon={<svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gear by Type (Top 10)</h3>
          <div style={{ height: 280 }}><canvas ref={typeCanvasRef}></canvas></div>
        </div>
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gear by Manufacturer (Top 10)</h3>
          <div style={{ height: 280 }}><canvas ref={mfrCanvasRef}></canvas></div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredGear}
        title={`${filteredGear.length.toLocaleString()} gear items`}
        searchPlaceholder="Search gear..."
      />
    </div>
  );
}
