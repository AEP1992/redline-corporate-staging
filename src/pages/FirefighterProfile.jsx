import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import Breadcrumb from '../components/Breadcrumb';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import FirefighterSvg from '../components/FirefighterSvg';
import { firefighters, isExpired } from '../dataProcessor';

export default function FirefighterProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ff = firefighters.find(f => f.id === Number(id));

  const gearCategories = useMemo(() => {
    if (!ff) return {};
    const cats = { Helmet: [], 'Jacket Shell': [], 'Jacket Liner': [], 'Pant Shell': [], 'Pant Liner': [], Boots: [], Gloves: [], Hood: [], Others: [] };
    ff.gear.forEach(g => {
      const cat = g.type;
      if (cats[cat]) cats[cat].push(g);
      else cats.Others.push(g);
    });
    return cats;
  }, [ff]);

  const alerts = useMemo(() => {
    if (!ff) return { nfpaLimit: 0, oos: 0, neverServiced: 0, missingMfg: 0 };
    let nfpaLimit = 0, oos = 0, neverServiced = 0, missingMfg = 0;
    ff.gear.forEach(g => {
      if (isExpired(g.mfgDate)) nfpaLimit++;
      if (g.status === 'OOS') oos++;
      if (!g.inspDate) neverServiced++;
      if (!g.mfgDate) missingMfg++;
    });
    return { nfpaLimit, oos, neverServiced, missingMfg };
  }, [ff]);

  const compliance = useMemo(() => {
    if (!ff || ff.gear.length === 0) return { pct: 0, ok: 0, expired: 0, noDate: 0, isCompliant: true };
    let ok = 0, expired = 0, noDate = 0;
    ff.gear.forEach(g => {
      if (isExpired(g.mfgDate)) expired++;
      else if (!g.mfgDate) noDate++;
      else ok++;
    });
    return { pct: ff.gear.length > 0 ? Math.round((ok / ff.gear.length) * 100) : 0, ok, expired, noDate, isCompliant: expired === 0 };
  }, [ff]);

  const avgGearAge = useMemo(() => {
    if (!ff) return '0.0';
    const now = new Date();
    let totalMonths = 0, count = 0;
    ff.gear.forEach(g => {
      if (!g.mfgDate) return;
      const match = g.mfgDate.match(/(\d{1,2})\s*-\s*(\d{4})/);
      if (!match) return;
      const mfgD = new Date(parseInt(match[2]), parseInt(match[1]) - 1);
      const months = (now.getFullYear() - mfgD.getFullYear()) * 12 + (now.getMonth() - mfgD.getMonth());
      if (months >= 0) { totalMonths += months; count++; }
    });
    return count > 0 ? (totalMonths / count / 12).toFixed(1) : '0.0';
  }, [ff]);

  if (!ff) return <div className="p-8 text-center text-gray-500">Firefighter not found.</div>;

  const lastService = ff.gear.find(g => g.inspDate)?.inspDate || '--';
  const totalAlerts = alerts.nfpaLimit + alerts.oos + alerts.neverServiced + alerts.missingMfg;

  const leftLabels = ['Helmet', 'Jacket Shell', 'Pant Shell', 'Boots'];
  const rightLabels = ['Jacket Liner', 'Gloves', 'Pant Liner', 'Others'];

  const gearColumns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'manufacturer', header: 'Manufacturer' },
    { key: 'mfgDate', header: 'MFG Date' },
    { key: 'type', header: 'Type' },
    { key: 'inspDate', header: 'Last Service' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/gear/${r.id}/edit`); }}
        className="text-navy hover:underline text-xs font-medium"
        data-testid={`button-edit-gear-${r.id}`}
      >Edit</button>
    )}
  ];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Roster', to: '/roster' },
        { label: ff.name }
      ]} />

      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4 mt-1" data-testid="button-back">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-lg border border-surface-border p-5 flex items-center gap-5 mb-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="text-firefighter-name">{ff.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
              Redline Corporate
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {ff.department}
            </span>
            <StatusBadge status="Active" />
          </div>
        </div>
      </div>

      {/* Main Content: Gear Figure + Side Info */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Gear Figure Section (2 cols) */}
        <div className="col-span-2 bg-white rounded-lg border border-surface-border p-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900">{ff.gear.length}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Total Gear Pieces</div>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            {/* Left labels */}
            <div className="flex flex-col gap-3 items-end" style={{ width: 170 }}>
              {leftLabels.map(label => {
                const items = gearCategories[label] || [];
                const lastDate = items.find(g => g.inspDate)?.inspDate || '--';
                return (
                  <GearLabel key={label} label={label} count={items.length} date={lastDate} align="right" />
                );
              })}
            </div>

            {/* Firefighter SVG */}
            <div className="flex-shrink-0" style={{ width: 160 }}>
              <FirefighterSvg className="w-full h-auto" />
            </div>

            {/* Right labels */}
            <div className="flex flex-col gap-3 items-start" style={{ width: 170 }}>
              {rightLabels.map(label => {
                const key = label === 'Others' ? 'Others' : label;
                const items = gearCategories[key] || [];
                // Merge Hood into Others if label is Others
                const extra = label === 'Others' ? (gearCategories['Hood'] || []) : [];
                const allItems = [...items, ...extra];
                const lastDate = allItems.find(g => g.inspDate)?.inspDate || '--';
                return (
                  <GearLabel key={label} label={label} count={allItems.length} date={lastDate} align="left" />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Service Info */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <h3 className="text-sm font-semibold text-gray-900">Service Info</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Service</span>
                <span className="font-semibold text-gray-900">{lastService}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Next Service Due</span>
                <span className="font-semibold text-gray-900">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg Gear Age</span>
                <span className="font-semibold text-gray-900">{avgGearAge} yrs</span>
              </div>
            </div>
          </div>

          {/* NFPA 1850 Compliance */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <h3 className="text-sm font-semibold text-gray-900">NFPA 1850 Compliance</h3>
              </div>
              <StatusBadge status={compliance.isCompliant ? 'Compliant' : 'Non-Compliant'} />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full ${compliance.isCompliant ? 'bg-green-500' : 'bg-gradient-to-r from-green-500 to-red-500'}`}
                style={{ width: `${compliance.pct}%` }}
              ></div>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>{compliance.ok} OK</span>
              {compliance.expired > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{compliance.expired} Expired</span>}
              {compliance.noDate > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span>{compliance.noDate} No Date</span>}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg border border-surface-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.4 14.55c-.55.95.14 2.14 1.23 2.14h16.76c1.09 0 1.78-1.19 1.23-2.14l-8.4-14.55a1.38 1.38 0 00-2.42 0z"/></svg>
                <h3 className="text-sm font-semibold text-gray-900">Alerts</h3>
              </div>
              {totalAlerts > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">{totalAlerts}</span>
              )}
            </div>
            <div className="space-y-3">
              <AlertRow icon="clock" label="Past NFPA 1850 Limit" desc="Exceeding 10-year service life" count={alerts.nfpaLimit} />
              <AlertRow icon="pause" label="Out of Service" desc="Pulled from active duty" count={alerts.oos} />
              <AlertRow icon="x" label="Never Serviced" desc="No inspection record found" count={alerts.neverServiced} />
              <AlertRow icon="info" label="Missing Mfg Date" desc="Cannot determine compliance" count={alerts.missingMfg} />
            </div>
          </div>
        </div>
      </div>

      {/* Gear Inventory Table */}
      <DataTable
        columns={gearColumns}
        data={ff.gear}
        title="Gear Inventory"
        searchPlaceholder="Search gear..."
      />
    </div>
  );
}

function GearLabel({ label, count, date, align }) {
  return (
    <div className={`border border-surface-border rounded-lg px-3 py-2 bg-white w-full ${align === 'right' ? 'text-right' : 'text-left'}`} data-testid={`gear-label-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold text-gray-900">{count}</div>
      <div className="flex items-center gap-1 text-xs text-gray-400" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        {date}
      </div>
    </div>
  );
}

function AlertRow({ icon, label, desc, count }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="flex-shrink-0">
        {icon === 'clock' && <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
        {icon === 'pause' && <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
        {icon === 'x' && <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>}
        {icon === 'info' && <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{count} {label}</div>
        <div className="text-xs text-gray-500 truncate">{desc}</div>
      </div>
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
    </div>
  );
}
