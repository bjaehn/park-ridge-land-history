import { Outlet } from "react-router-dom";
import { TopNav } from "../components/TopNav";

export function AppLayout() {
  return (
    <div className="page-shell">
      <TopNav />
      <main className="page-main">
        <Outlet />
      </main>
    </div>
  );
}
