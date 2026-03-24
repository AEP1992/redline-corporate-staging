import { useNavigate } from 'react-router-dom';
import { useMemo, useRef, useEffect, useState } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { departments, firefighters, totals, passRate, statusBreakdown, expiredCount } from '../dataProcessor';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function Roster() {
  const navigate = useNavigate();
  const [deptFilter, setDeptFilter] = useState('');
  const donutRef = useRef(null);
  const barRef = useRef(null);
  const donutCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);

  const filteredFfs = useMemo(() => {
    if (!deptFilter) return firefighters;
    return firefighters.filter(f => f.departmentId === Number(deptFilter));
  }, [deptFilter]);

  const totalInspections = totals.gear;
  const criticalItems = expiredCount;

  useEffect(() => {
    // Donut chart
    const passCount = statusBreakdown.PASS;
    const expCount = expiredCount;
    const oosCount = statusBreakdown.OOS;
    const repairCount = statusBreakdown.REPAIR;
    const totalGear = totals.gear;

    if (donutRef.current) donutRef.current.destroy();
    donutRef.current = new Chart(donutCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Expired', 'Out of Service', 'Action Req.'],
        datasets: [{
          data: [passCount, expCount, oosCount, repairCount],
          backgroundColor: ['#22c55e', '#dc2626', '#f59e0b', '#f97316'],
          borderWidth: 0,
          cutout: '70%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea } = chart;
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;
          ctx.save();
          ctx.font = 'bold 22px Inter, sans-serif';
          ctx.fillStyle = '#1a2a4a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${passRate}%`, centerX, centerY - 8);
          ctx.font = '11px Inter, sans-serif';
          ctx.fillStyle = '#6b7280';
          ctx.fillText('Pass Rate', centerX, centerY + 12);
          ctx.restore();
        }
      }]
    });

    // Bar chart
    const sorted = [...departments].sort((a, b) => b.stats.ff_count - a.stats.ff_count).slice(0, 10);
    if (barRef.current) barRef.current.destroy();
    barRef.current = new Chart(barCanvasRef.current, {
      type: 'bar',
      data: {
        labels: sorted.map(d => d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name),
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

    return () => { donutRef.current?.destroy(); barRef.current?.destroy(); };
  }, []);

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'department', header: 'Department' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Roster' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Roster</h1>
      <p className="text-gray-500 text-sm mb-6">{totals.firefighters.toLocaleString()} personnel across {totals.departments} departments</p>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiCard value={totals.firefighters.toLocaleString()} label="Total Personnel" color="blue" />
        <KpiCard value={passRate + '%'} label="Gear Pass Rate" color="green" />
        <KpiCard value={criticalItems} label="Critical Items" color="orange" />
        <KpiCard value={totalInspections.toLocaleString()} label="Total Inspections" color="blue" />
        <KpiCard value={totals.departments} label="Departments" color="navy" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gear Compliance Status</h3>
          <div style={{ height: 220 }}><canvas ref={donutCanvasRef}></canvas></div>
          <div className="mt-3 pt-3 border-t border-surface-border flex justify-between text-xs text-gray-500">
            <span>Total Gear</span>
            <span className="font-semibold text-gray-900">{totals.gear.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Personnel per Department (Top 10)</h3>
          <div style={{ height: 280 }}><canvas ref={barCanvasRef}></canvas></div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredFfs}
        title={`${filteredFfs.length} personnel`}
        searchPlaceholder="Search roster..."
        onRowClick={(row) => navigate(`/roster/${row.id}`)}
        extra={
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            data-testid="select-department-filter"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        }
      />
    </div>
  );
}
