import { useState } from "react";
import AWSDetailedGuide from "../AWS_Detailed_Guide_With_Examples.jsx";
import AWSComparisons from "../AWS_Service_Comparisons.jsx";
import AWSEncyclopedia from "../AWS_Services_Encyclopedia.jsx";
import CachingAndSystemDesign from "../Caching_SystemDesign_InfraDesign.jsx";
import CloudOpsScenarios from "../Cloud_Ops_Scenario_Practice.jsx";
import KubernetesCompleteGuide from "../Kubernetes_Complete_Guide.jsx";

const NOTES = [
  {
    id: "aws-guide",
    label: "AWS Detailed Guide",
    icon: "📘",
    subtitle: "Deep dives with examples",
    component: AWSDetailedGuide,
  },
  {
    id: "aws-comparisons",
    label: "AWS Service Comparisons",
    icon: "⚖️",
    subtitle: "Side-by-side service analysis",
    component: AWSComparisons,
  },
  {
    id: "aws-encyclopedia",
    label: "AWS Encyclopedia",
    icon: "📚",
    subtitle: "Full service reference",
    component: AWSEncyclopedia,
  },
  {
    id: "caching-sysdesign",
    label: "Caching & System Design",
    icon: "🏗️",
    subtitle: "Infra design patterns",
    component: CachingAndSystemDesign,
  },
  {
    id: "cloud-ops",
    label: "Cloud Ops Scenarios",
    icon: "☁️",
    subtitle: "Hands-on practice",
    component: CloudOpsScenarios,
  },
  {
    id: "kubernetes",
    label: "Kubernetes Complete Guide",
    icon: "☸️",
    subtitle: "Security, Networking, Monitoring",
    component: KubernetesCompleteGuide,
  },
];

const SIDEBAR_WIDTH = 260;

export default function App() {
  const [activeId, setActiveId] = useState(NOTES[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const active = NOTES.find((n) => n.id === activeId);
  const ActiveComponent = active.component;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0B1120" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? SIDEBAR_WIDTH : 0,
          minWidth: sidebarOpen ? SIDEBAR_WIDTH : 0,
          background: "#0F1B2D",
          borderRight: "1px solid #1E3A5F",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.2s ease, min-width 0.2s ease",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 20px 14px",
            borderBottom: "1px solid #1E3A5F",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#E2E8F0",
                  whiteSpace: "nowrap",
                }}
              >
                Quick Notes
              </div>
              <div style={{ fontSize: 11, color: "#64748B", whiteSpace: "nowrap" }}>
                AWS & Cloud Reference
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#475569", letterSpacing: 1, padding: "4px 10px 8px", textTransform: "uppercase" }}>
            Notes
          </div>
          {NOTES.map((note) => {
            const isActive = note.id === activeId;
            return (
              <button
                key={note.id}
                onClick={() => setActiveId(note.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? "#1E3A5F40" : "transparent",
                  borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
                  marginBottom: 2,
                  transition: "background 0.15s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#1E3A5F20";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{note.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#93C5FD" : "#CBD5E1",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {note.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {note.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #1E3A5F",
            fontSize: 11,
            color: "#334155",
            flexShrink: 0,
          }}
        >
          {NOTES.length} notes · quick-notes
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            height: 50,
            background: "#0F1B2D",
            borderBottom: "1px solid #1E3A5F",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            position: "sticky",
            top: 0,
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748B",
              padding: "4px 6px",
              borderRadius: 6,
              fontSize: 16,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <span style={{ fontSize: 16 }}>{active.icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#E2E8F0" }}>
            {active.label}
          </span>
          <span style={{ fontSize: 12, color: "#475569", marginLeft: 4 }}>
            — {active.subtitle}
          </span>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
