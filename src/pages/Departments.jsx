import { useNavigate } from 'react-router-dom';
import { useMemo, useRef, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { departments } from '../dataProcessor';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function Departments() {
  const navigate = useNavigate();
  const cityChartRef = useRef(null);
  const personnelChartRef = useRef(null);
  const cityCanvasRef = useRef(null);
  const personnelCanvasRef = useRef(null);

  const uniqueCities = useMemo(() => [...new Set(departments.map(d => d.state))], []);

  useEffect(() => {
    // Departments by State chart
    const stateCounts = {};
    departments.forEach(d => { stateCounts[d.state] = (stateCounts[d.state] || 0) + 1; });
    
    if (cityChartRef.current) cityChartRef.current.destroy();
    cityChartRef.current = new Chart(cityCanvasRef.current, {
      type: 'bar',
      data: {
        labels: Object.keys(stateCounts),
        datasets: [{
          label: 'Departments',
          data: Object.values(stateCounts),
          backgroundColor: '#64748b',
          borderRadius: 4,
          barThickness: 40
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

    // Personnel per department
    const sorted = [...departments].sort((a, b) => b.stats.ff_count - a.stats.ff_count).slice(0, 10);
    if (personnelChartRef.current) personnelChartRef.current.destroy();
    personnelChartRef.current = new Chart(personnelCanvasRef.current, {
      type: 'bar',
      data: {
        labels: sorted.map(d => d.name.length > 25 ? d.name.slice(0, 25) + '...' : d.name),
        datasets: [{
          label: 'Personnel',
          data: sorted.map(d => d.stats.ff_count),
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

    return () => {
      cityChartRef.current?.destroy();
      personnelChartRef.current?.destroy();
    };
  }, []);

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { key: 'name', header: 'Department', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'city', header: 'City' },
    { key: 'state', header: 'State' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'personnel', header: 'Personnel', accessor: (r) => r.stats.ff_count },
    { key: 'gear', header: 'Gear Items', accessor: (r) => r.stats.gear_count },
    { key: 'avgAge', header: 'Avg Gear Age', render: (r) => <span>{r.avgGearAge || '0.0'} yrs</span> },
    { key: 'mfrs', header: 'Manufacturers', render: (r) => <span>{r.manufacturers?.length || 0}</span> },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Departments' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Departments</h1>
      <p className="text-gray-500 text-sm mb-6">{departments.length} departments across Redline Corporate</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard value={departments.length} label="Total Departments" color="blue" />
        <KpiCard value={departments.reduce((s, d) => s + d.stats.ff_count, 0).toLocaleString()} label="Total Personnel" color="green" />
        <KpiCard value={uniqueCities.length} label="States Covered" color="navy" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Departments by State (Top 10)</h3>
          <div style={{ height: 120 }}><canvas ref={cityCanvasRef}></canvas></div>
        </div>
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Personnel per Department (Top 10)</h3>
          <div style={{ height: 280 }}><canvas ref={personnelCanvasRef}></canvas></div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={departments}
        title={`${departments.length} departments`}
        searchPlaceholder="Search department..."
        onRowClick={(row) => navigate(`/departments/${row.id}`)}
      />
    </div>
  );
}
