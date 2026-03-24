import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useRef, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { departments, firefighters, allGear } from '../dataProcessor';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function DepartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dept = departments.find(d => d.id === Number(id));
  const deptFfs = useMemo(() => firefighters.filter(f => f.departmentId === Number(id)), [id]);
  const deptGear = useMemo(() => allGear.filter(g => g.departmentId === Number(id)), [id]);
  const statusChartRef = useRef(null);
  const statusCanvasRef = useRef(null);
  const mfrChartRef = useRef(null);
  const mfrCanvasRef = useRef(null);

  useEffect(() => {
    if (!dept) return;
    const stats = dept.stats;
    
    // Status chart
    if (statusChartRef.current) statusChartRef.current.destroy();
    statusChartRef.current = new Chart(statusCanvasRef.current, {
      type: 'bar',
      data: {
        labels: ['Passed', 'Repair', 'Expired', 'Out of Service'],
        datasets: [{
          data: [stats.pass, stats.repair, dept.expiredCount || 0, stats.oos],
          backgroundColor: ['#22c55e', '#f97316', '#dc2626', '#f59e0b'],
          borderRadius: 4,
          barThickness: 20
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

    // Manufacturer chart
    if (dept.manufacturers && dept.manufacturers.length > 0) {
      if (mfrChartRef.current) mfrChartRef.current.destroy();
      const top8 = dept.manufacturers.slice(0, 8);
      mfrChartRef.current = new Chart(mfrCanvasRef.current, {
        type: 'bar',
        data: {
          labels: top8.map(([m]) => m),
          datasets: [{
            data: top8.map(([, c]) => c),
            backgroundColor: '#1a2a4a',
            borderRadius: 4,
            barThickness: 16
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
    }

    return () => {
      statusChartRef.current?.destroy();
      mfrChartRef.current?.destroy();
    };
  }, [dept]);

  if (!dept) return <div className="p-8 text-center text-gray-500">Department not found.</div>;

  const passRate = dept.stats.gear_count > 0 ? ((dept.stats.pass / dept.stats.gear_count) * 100).toFixed(1) + '%' : '0%';
  const needAttention = dept.stats.repair + dept.stats.oos;
  const gearTypes = dept.gearByType ? Object.keys(dept.gearByType).length : 0;

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'gear', header: 'Gear Items', accessor: (r) => r.stats.total },
    { key: 'lastService', header: 'Last Service', render: (r) => {
      const dates = r.gear.map(g => g.inspDate).filter(Boolean);
      return dates.length > 0 ? dates[0] : '--';
    }},
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/roster/${r.id}`); }}
        className="text-navy hover:underline text-xs font-medium"
        data-testid={`button-view-${r.id}`}
      >View</button>
    )}
  ];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Departments', to: '/departments' },
        { label: dept.name }
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 mt-2">{dept.name}</h1>
      <p className="text-gray-500 text-sm mb-6">{dept.stats.ff_count} active personnel · {dept.stats.gear_count} gear items</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard value={dept.stats.ff_count} label="Active Personnel" color="blue" />
        <KpiCard value={dept.stats.gear_count} label="Gear Assigned" color="green" />
        <KpiCard value={passRate} label="Pass Rate" color="green" />
        <KpiCard value={needAttention} label="Need Attention" color="orange" />
        <KpiCard value={`${dept.avgGearAge || '0.0'} yrs`} label="Avg Gear Age" color="navy" />
        <KpiCard value={dept.manufacturers?.length || 0} label="Manufacturers" color="navy" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gear Status Breakdown</h3>
          <div style={{ height: 160 }}><canvas ref={statusCanvasRef}></canvas></div>
        </div>
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gear by Manufacturer</h3>
          {dept.manufacturers && dept.manufacturers.length > 0 ? (
            <div style={{ height: 160 }}><canvas ref={mfrCanvasRef}></canvas></div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No manufacturer data</div>
          )}
        </div>
      </div>

      {/* Manufacturer Breakdown Table */}
      {dept.manufacturers && dept.manufacturers.length > 0 && (
        <div className="bg-white rounded-lg border border-surface-border p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Manufacturer Details</h3>
          <div className="grid grid-cols-4 gap-3">
            {dept.manufacturers.map(([mfr, count]) => (
              <div key={mfr} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-800">{mfr}</span>
                <span className="text-sm font-bold text-navy">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gear Type Summary */}
      {dept.gearByType && Object.keys(dept.gearByType).length > 0 && (
        <div className="bg-white rounded-lg border border-surface-border p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Equipment Summary</h3>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(dept.gearByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-navy">{count}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={deptFfs}
        title={`${deptFfs.length} personnel`}
        searchPlaceholder="Search roster..."
        onRowClick={(row) => navigate(`/roster/${row.id}`)}
      />
    </div>
  );
}
