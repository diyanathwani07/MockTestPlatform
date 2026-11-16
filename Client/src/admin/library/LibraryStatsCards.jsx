import React from "react";
import { Folder, Files, Globe, BookOpen } from "lucide-react";

export default function LibraryStatsCards({ stats, loading }) {
  const cards = [
    {
      label: "Total Folders",
      value: stats?.totalFolders ?? 0,
      icon: Folder,
      colorClass: "purple",
      desc: "All hierarchical directories"
    },
    {
      label: "Total Resources",
      value: stats?.totalResources ?? 0,
      icon: Files,
      colorClass: "blue",
      desc: "PDFs, docs, notes & links"
    },
    {
      label: "Global Library",
      value: stats?.globalResources ?? 0,
      icon: Globe,
      colorClass: "emerald",
      desc: "Shared cross-exam materials"
    },
    {
      label: "Exam-Specific",
      value: stats?.examResources ?? 0,
      icon: BookOpen,
      colorClass: "amber",
      desc: "Series-dedicated content"
    }
  ];

  return (
    <div className="library-stats-grid">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div key={idx} className="library-stat-card">
            <div className={`stat-icon-wrapper ${card.colorClass}`}>
              <IconComponent size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">{card.label}</span>
              <span className="stat-number">
                {loading ? "..." : (card.value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
