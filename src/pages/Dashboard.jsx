import { useNavigate } from 'react-router-dom';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import { totals, passRate, statusBreakdown, expiredCount, allGear } from '../dataProcessor';

export default function Dashboard() {
  const navigate = useNavigate();
  const oosCount = statusBreakdown.OOS;
  const repairCount = statusBreakdown.REPAIR;
  const healthPct = parseFloat(passRate);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mt-2">
        Franchise Overview — Redline Corporate
      </h1>
      <p className="text-gray-500 text-sm mb-6">{totals.departments} departments</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard value={totals.gear.toLocaleString()} label="Pieces Inspected" color="blue"
          icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <KpiCard value={totals.firefighters.toLocaleString()} label="Personnel" color="green"
          icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>} />
        <KpiCard value={totals.repair.toLocaleString()} label="Repairs Completed" color="orange"
          icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>} />
        <KpiCard value={totals.departments.toLocaleString()} label="Depts Serviced" color="navy"
          icon={<svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>} />
      </div>

      {/* Upcoming Schedule + Urgent Items */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Upcoming Schedule */}
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <h2 className="text-base font-semibold text-gray-900">Upcoming Schedule</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
            <span className="text-sm">No upcoming jobs scheduled</span>
          </div>
        </div>

        {/* Urgent Items */}
        <div className="bg-white rounded-lg border border-surface-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>
              <h2 className="text-base font-semibold text-gray-900">Urgent Items</h2>
            </div>
            <span className="text-xs font-semibold text-gray-400">3 ITEMS</span>
          </div>
          <div className="space-y-3">
            <UrgentItem
              icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>}
              label="Expired Gear"
              count={expiredCount}
              desc="Items past expiration date requiring immediate replacement"
              onClick={() => navigate('/gear?filter=expired')}
            />
            <UrgentItem
              icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
              label="Out of Service"
              count={oosCount}
              desc="Equipment currently pulled from active duty"
              onClick={() => navigate('/gear?filter=oos')}
            />
            <UrgentItem
              icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>}
              label="Action Required"
              count={repairCount}
              desc="Items flagged for follow-up or maintenance"
              onClick={() => navigate('/gear?filter=repair')}
            />
          </div>
        </div>
      </div>

      {/* Fleet Health Score */}
      <div className="bg-white rounded-lg border border-surface-border p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 uppercase">All-Time Overview</span>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-sm font-semibold">Fleet Health Score</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-green-500 via-green-400 to-yellow-400" style={{ width: `${healthPct}%` }}></div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>{healthPct}% Compliant</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{(100 - healthPct).toFixed(1)}% Critical</span>
            <span className="text-gray-400">{totals.gear.toLocaleString()} items tracked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UrgentItem({ icon, label, count, desc, onClick }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      data-testid={`urgent-${label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900">{label} ({count})</div>
        <div className="text-xs text-gray-500 truncate">{desc}</div>
      </div>
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
    </div>
  );
}
