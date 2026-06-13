import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import "./AppShell.css";

export function AppShell() {
  return (
    <div className="new-app-shell">
      <Header />
      <main className="page-main">
        <Outlet />
      </main>
    </div>
  );
}
