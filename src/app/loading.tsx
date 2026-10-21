import { Loading } from "./components";
import { WorkspaceSidebar } from "./workspace-sidebar";

export default function PageLoading() {
  return (
    <div className="app-shell">
      <WorkspaceSidebar activeItem="dashboard" />
      <div className="app-main">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Data discovery and classification</p>
            <h1>Dashboard</h1>
          </div>
        </header>
        <main className="workspace-content">
          <section className="workspace-section">
            <Loading label="Loading your workspace..." />
          </section>
        </main>
      </div>
    </div>
  );
}
