import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import Breadcrumb from '../components/Breadcrumb';
import { allGear, firefighters, departments } from '../dataProcessor';

export default function GearEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const gear = allGear.find(g => g.id === Number(id));

  const sameDeptFfs = useMemo(() => {
    if (!gear) return [];
    return firefighters.filter(f => f.departmentId === gear.departmentId);
  }, [gear]);

  const [showNewFF, setShowNewFF] = useState(false);
  const [newFFLast, setNewFFLast] = useState('');
  const [newFFFirst, setNewFFFirst] = useState('');

  const [form, setForm] = useState(() => {
    if (!gear) return {};
    return {
      name: gear.name,
      type: gear.type,
      serialNumber: gear.serialNumber,
      departmentId: gear.departmentId,
      firefighterId: gear.firefighterId,
      manufacturer: gear.manufacturer,
      mfgDate: gear.mfgDate,
    };
  });

  if (!gear) return <div className="p-8 text-center text-gray-500">Gear item not found.</div>;

  const dept = departments.find(d => d.id === gear.departmentId);

  const handleReset = () => {
    setForm({
      name: gear.name,
      type: gear.type,
      serialNumber: gear.serialNumber,
      departmentId: gear.departmentId,
      firefighterId: gear.firefighterId,
      manufacturer: gear.manufacturer,
      mfgDate: gear.mfgDate,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a static app, just navigate back
    alert('Gear updated successfully (demo mode)');
    navigate(-1);
  };

  const gearTypes = ['Helmet', 'Jacket Shell', 'Jacket Liner', 'Pant Shell', 'Pant Liner', 'Boots', 'Gloves', 'Hood', 'Others'];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Gear', to: '/gear' },
        { label: 'Edit Gear' }
      ]} />

      <h1 className="text-2xl font-bold text-gray-900 text-center mt-4 mb-6">Edit Gear</h1>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors mb-6"
        data-testid="button-back"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-surface-border p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Gear Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gear Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              data-testid="input-gear-name"
            />
          </div>

          {/* Gear Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gear Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
              data-testid="select-gear-type"
            >
              {gearTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>

          {/* Gear Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gear Size</label>
            <input
              type="text"
              placeholder="Enter Gear Size"
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              data-testid="input-gear-size"
            />
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Serial Number</label>
            <input
              type="text"
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              data-testid="input-serial-number"
            />
          </div>

          {/* Department (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department *</label>
            <select
              value={form.departmentId}
              disabled
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm bg-gray-50 text-gray-500"
              data-testid="select-department"
            >
              <option value={form.departmentId}>{dept?.name}</option>
            </select>
          </div>

          {/* Assigned Roster */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assigned Roster</label>
            {!showNewFF ? (
              <div className="space-y-2">
                <select
                  value={form.firefighterId}
                  onChange={(e) => setForm({ ...form, firefighterId: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
                  data-testid="select-assigned-roster"
                >
                  {sameDeptFfs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewFF(true)}
                  className="text-xs font-semibold text-navy hover:text-navy-light flex items-center gap-1"
                  data-testid="button-add-new-firefighter"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                  Assign to new firefighter
                </button>
              </div>
            ) : (
              <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-2">New Firefighter</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Last Name *"
                    value={newFFLast}
                    onChange={(e) => setNewFFLast(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                    data-testid="input-new-ff-last"
                  />
                  <input
                    type="text"
                    placeholder="First Name"
                    value={newFFFirst}
                    onChange={(e) => setNewFFFirst(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                    data-testid="input-new-ff-first"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowNewFF(false); setNewFFLast(''); setNewFFFirst(''); }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newFFLast.trim()) {
                        setForm({ ...form, firefighterId: -1, newFirefighter: `${newFFLast.trim()}, ${newFFFirst.trim()}`.trim().replace(/, $/, '') });
                      }
                    }}
                    className="text-xs font-semibold text-navy hover:text-navy-light"
                  >
                    Confirm
                  </button>
                </div>
                {form.newFirefighter && (
                  <p className="text-xs text-green-700 font-medium">Will assign to: {form.newFirefighter}</p>
                )}
              </div>
            )}
          </div>

          {/* Manufacturer */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Manufacturer *</label>
            <input
              type="text"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              data-testid="input-manufacturer"
            />
          </div>

          {/* Manufacturing Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Manufacturing Date</label>
            <input
              type="text"
              value={form.mfgDate}
              onChange={(e) => setForm({ ...form, mfgDate: e.target.value })}
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="MM - YYYY"
              data-testid="input-mfg-date"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-surface-border">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 border border-surface-border rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            data-testid="button-reset-form"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Reset Form
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors"
            data-testid="button-update-gear"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            Update Gear
          </button>
        </div>
      </form>
    </div>
  );
}
