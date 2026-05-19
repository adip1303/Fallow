import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar/Sidebar';

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export function FullScreenLayout() {
  return (
    <div className="app-shell">
      <main className="app-content app-content--full">
        <Outlet />
      </main>
    </div>
  );
}
