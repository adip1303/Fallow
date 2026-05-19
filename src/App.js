import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout, { FullScreenLayout } from './components/Layout';
import Login from './pages/Login';
import Garden from './pages/Garden';
import EmptyGarden from './pages/EmptyGarden';
import SeedDetail from './pages/SeedDetail';
import NewSeed from './pages/NewSeed';
import NewCondition from './pages/NewCondition';
import Conditions from './pages/Conditions';
import Categories from './pages/Categories';
import NewCategory from './pages/NewCategory';
import Roots from './pages/Roots';
import Activity from './pages/Activity';
import { migrateStaticSeedsToLocalStorage } from './utils/staticSeedMigration';
import './App.css';

export default function App() {
  migrateStaticSeedsToLocalStorage();

  return (
    <HashRouter>
      <Routes>
        <Route element={<FullScreenLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/garden" element={<Garden />} />
          <Route path="/garden/empty" element={<EmptyGarden />} />
          <Route path="/seeds/new" element={<NewSeed />} />
          <Route path="/seeds/:id" element={<SeedDetail />} />
          <Route path="/conditions" element={<Conditions />} />
          <Route path="/conditions/new" element={<NewCondition />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/new" element={<NewCategory />} />
          <Route path="/roots" element={<Roots />} />
          <Route path="/activity" element={<Activity />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
