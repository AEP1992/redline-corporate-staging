import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import Breadcrumb from '../components/Breadcrumb';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { allGear, firefighters, departments, uniqueMfrs, gearByType } from '../dataProcessor';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const mode = searchParams.get('mode') || 'GEAR';
  const [activeMode, setActiveMode] = useState(mode);

  useEffect(() => { setActiveMode(mode); }, [mode]);

  const query = q.toLowerCase();

  const gearResults = useMemo(() => {
    if (!query) return [];
    return allGear.filter(g =>
      g.name.toLowerCase().includes(query) ||
      g.serialNumber.toLowerCase().includes(query) ||
      g.manufacturer.toLowerCase().includes(query) ||
      g.firefighterName.toLowerCase().includes(query) ||
      g.department.toLowerCase().includes(query)
    );
  }, [query]);

  const rosterResults = useMemo(() => {
    if (!query) return [];
    return firefighters.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.department.toLowerCase().includes(query)
    );
  }, [query]);

  const deptResults = useMemo(() => {
    if (!query) return [];
    return departments.filter(d =>
      d.name.toLowerCase().includes(query) ||
      d.city.toLowerCase().includes(query)
    );
  }, [query]);

  const gearColumns = [
    { key: 'serialNumber', header: 'Serial #', render: (r) => <span className="font-mono text-xs">{r.serialNumber || '--'}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'type', header: 'Type' },
    { key: 'manufacturer', header: 'Manufacturer' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'firefighterName', header: 'Roster' },
    { key: 'department', header: 'Department' },
  ];

  const rosterColumns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'department', header: 'Department' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const deptColumns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { key: 'name', header: 'Department', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'city', header: 'City' },
    { key: 'state', header: 'State' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'personnel', header: 'Personnel', accessor: (r) => r.stats.ff_count },
  ];

  const results = activeMode === 'GEAR' ? gearResults : activeMode === 'ROSTER' ? rosterResults : deptResults;
  const columns = activeMode === 'GEAR' ? gearColumns : activeMode === 'ROSTER' ? rosterColumns : deptColumns;

  const activeGear = gearResults.filter(g => g.status === 'PASS').length;
  const inactiveGear = gearResults.filter(g => g.status !== 'PASS').length;
  const gearTypesFound = new Set(gearResults.map(g => g.type)).size;
  const mfrsFound = new Set(gearResults.map(g => g.manufacturer).filter(Boolean)).size;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Search' }]} />

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeMode === 'GEAR' ? 'Gear' : activeMode === 'ROSTER' ? 'Roster' : 'Department'} Search
          </h1>
          {q && <p className="text-gray-500 text-sm">Results for "{q}"</p>}
        </div>
        {q && (
          <button
            onClick={() => navigate('/search')}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 border border-surface-border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            data-testid="button-clear-search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
            Clear
          </button>
        )}
      </div>

      {activeMode === 'GEAR' && q && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <KpiCard value={gearResults.length} label="Results Found" color="blue" />
          <KpiCard value={activeGear} label="Active" color="green" />
          <KpiCard value={inactiveGear} label="Inactive" color="red" />
          <KpiCard value={gearTypesFound} label="Gear Types" color="orange" />
          <KpiCard value={mfrsFound} label="Manufacturers" color="navy" />
        </div>
      )}

      <DataTable
        columns={columns}
        data={results}
        title={`Results ${results.length}`}
        searchPlaceholder={`Search ${activeMode.toLowerCase()}...`}
        onRowClick={(row) => {
          if (activeMode === 'ROSTER') navigate(`/roster/${row.id}`);
          if (activeMode === 'DEPT') navigate(`/departments/${row.id}`);
        }}
      />
    </div>
  );
}
