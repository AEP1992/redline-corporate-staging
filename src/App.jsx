import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import DepartmentDetail from './pages/DepartmentDetail';
import Roster from './pages/Roster';
import FirefighterProfile from './pages/FirefighterProfile';
import GearInventory from './pages/GearInventory';
import Search from './pages/Search';
import GearEdit from './pages/GearEdit';
import Manufacturers from './pages/Manufacturers';
import Login from './pages/Login';

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout user={user} onLogout={() => setUser(null)} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/departments/:id" element={<DepartmentDetail />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/roster/:id" element={<FirefighterProfile />} />
          <Route path="/gear" element={<GearInventory />} />
          <Route path="/gear/:id/edit" element={<GearEdit />} />
          <Route path="/manufacturers" element={<Manufacturers />} />
          <Route path="/search" element={<Search />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
