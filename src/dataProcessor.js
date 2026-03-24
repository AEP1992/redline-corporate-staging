// Process raw JSON data into app-friendly structures
import RAW_DATA from './data';

// Build flat lists
const departments = [];
const firefighters = [];
const allGear = [];

let ffId = 1;
let gearId = 1;

RAW_DATA.departments.forEach((dept, dIdx) => {
  const deptId = dIdx + 1;
  const deptObj = {
    id: deptId,
    name: dept.name,
    city: extractCity(dept.name),
    state: 'FL',
    status: 'Active',
    stats: dept.stats,
    spare_count: dept.spare_count
  };
  departments.push(deptObj);

  dept.firefighters.forEach((ff) => {
    const fullName = [ff.first, ff.last].filter(Boolean).join(' ').trim() || ff.last || 'Unknown';
    const ffObj = {
      id: ffId++,
      name: fullName,
      first: ff.first || '',
      last: ff.last || '',
      departmentId: deptId,
      department: dept.name,
      assignment: ff.assignment || '',
      status: 'Active',
      stats: ff.stats,
      gear: []
    };

    ff.gear.forEach((g) => {
      const gearObj = {
        id: gearId++,
        name: g.item,
        type: categorizeGear(g.item),
        serialNumber: g.sn || '',
        manufacturer: g.mfr || 'Unknown',
        mfgDate: g.mfg || '',
        status: normalizeStatus(g.status),
        repair: g.repair || false,
        findings: g.findings || '',
        hydro: g.hydro || 'No',
        inspDate: g.insp_date || '',
        firefighterId: ffObj.id,
        firefighterName: fullName,
        departmentId: deptId,
        department: dept.name
      };
      allGear.push(gearObj);
      ffObj.gear.push(gearObj);
    });

    firefighters.push(ffObj);
  });
});

function extractCity(deptName) {
  const cities = {
    'Boca Grande Fire Department': 'Boca Grande',
    'Desoto County Fire Division': 'Arcadia',
    'Englewood Fire Department': 'Englewood',
    'Fayette County Dept of Fire and Emergency': 'Fayetteville',
    'Gulfport Fire Rescue': 'Gulfport',
    'Key Largo Fire Department': 'Key Largo',
    'Pinellas Suncoast Fire and Rescue District': 'Indian Rocks Beach',
    'Sarasota County Fire Department': 'Sarasota',
    'Sarasota Manatee Airport Authority': 'Sarasota',
    'St Pete Beach Fire Department': 'St Pete Beach',
    'Tavares Fire Department': 'Tavares',
    'Treasure Island Fire Rescue': 'Treasure Island',
    'USCGC Thetis': 'Key West'
  };
  return cities[deptName] || '';
}

function categorizeGear(item) {
  const lower = item.toLowerCase();
  if (lower.includes('helmet')) return 'Helmet';
  if (lower.includes('jacket') && lower.includes('shell')) return 'Jacket Shell';
  if (lower.includes('jacket') && lower.includes('liner')) return 'Jacket Liner';
  if (lower.includes('pant') && lower.includes('shell')) return 'Pant Shell';
  if (lower.includes('pant') && lower.includes('liner')) return 'Pant Liner';
  if (lower.includes('boot')) return 'Boots';
  if (lower.includes('glove')) return 'Gloves';
  if (lower.includes('hood')) return 'Hood';
  return 'Others';
}

function normalizeStatus(s) {
  if (!s || s === 'nan') return 'UNKNOWN';
  return s.toUpperCase();
}

// Compute totals
const totals = RAW_DATA.totals;
const passRate = totals.gear > 0 ? ((totals.pass / totals.gear) * 100).toFixed(1) : '0.0';

// Gear type counts
const gearByType = {};
const gearByMfr = {};
allGear.forEach(g => {
  gearByType[g.type] = (gearByType[g.type] || 0) + 1;
  const mfr = g.manufacturer || 'Unknown';
  gearByMfr[mfr] = (gearByMfr[mfr] || 0) + 1;
});

// Unique manufacturers count (excluding empty)
const uniqueMfrs = new Set(allGear.map(g => g.manufacturer).filter(m => m && m !== 'Unknown'));

// Status breakdown
const statusBreakdown = { PASS: 0, REPAIR: 0, OOS: 0, EXPIRED: 0, UNKNOWN: 0 };
allGear.forEach(g => {
  if (statusBreakdown.hasOwnProperty(g.status)) statusBreakdown[g.status]++;
  else statusBreakdown.UNKNOWN++;
});

// Expired count: gear where mfg date is > 10 years old
function isExpired(mfgDate) {
  if (!mfgDate) return false;
  const match = mfgDate.match(/(\d{1,2})\s*-\s*(\d{4})/);
  if (!match) return false;
  const year = parseInt(match[2]);
  const month = parseInt(match[1]);
  const mfgD = new Date(year, month - 1);
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  return mfgD < tenYearsAgo;
}

const expiredCount = allGear.filter(g => isExpired(g.mfgDate)).length;

export {
  departments,
  firefighters,
  allGear,
  totals,
  passRate,
  gearByType,
  gearByMfr,
  uniqueMfrs,
  statusBreakdown,
  expiredCount,
  isExpired,
  categorizeGear
};

// Per-department computed stats
function computeAvgGearAge(gearItems) {
  const now = new Date();
  let totalMonths = 0;
  let count = 0;
  gearItems.forEach(g => {
    if (!g.mfgDate) return;
    const match = g.mfgDate.match(/(\d{1,2})\s*[-\/]\s*(\d{4})/);
    if (!match) return;
    const year = parseInt(match[2]);
    const month = parseInt(match[1]);
    if (year < 1990 || year > 2030 || month < 1 || month > 12) return;
    const mfgD = new Date(year, month - 1);
    const diffMs = now - mfgD;
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
    if (diffMonths > 0 && diffMonths < 600) {
      totalMonths += diffMonths;
      count++;
    }
  });
  return count > 0 ? (totalMonths / count / 12).toFixed(1) : '0.0';
}

function getDeptManufacturers(gearItems) {
  const mfrMap = {};
  gearItems.forEach(g => {
    const mfr = g.manufacturer || 'Unknown';
    if (mfr === 'Unknown') return;
    mfrMap[mfr] = (mfrMap[mfr] || 0) + 1;
  });
  return Object.entries(mfrMap).sort((a, b) => b[1] - a[1]);
}

// Enrich departments with computed data
departments.forEach(dept => {
  const deptGear = allGear.filter(g => g.departmentId === dept.id);
  dept.avgGearAge = computeAvgGearAge(deptGear);
  dept.manufacturers = getDeptManufacturers(deptGear);
  dept.expiredCount = deptGear.filter(g => isExpired(g.mfgDate)).length;
  dept.gearByType = {};
  deptGear.forEach(g => { dept.gearByType[g.type] = (dept.gearByType[g.type] || 0) + 1; });
});

// Global avg gear age
const globalAvgGearAge = computeAvgGearAge(allGear);

export { globalAvgGearAge };
