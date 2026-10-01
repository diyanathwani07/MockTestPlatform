import React, { useState, useEffect, useRef } from "react";
import { Search, Command, LayoutDashboard, BookOpen, PenTool, Target, Trophy, HelpCircle, User, Shield, Layers, FileText, BarChart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/UniversalSearch.css";

const UniversalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { role } = useAuth();
  const inputRef = useRef(null);

  const isAdmin = role === "admin" || role === "superadmin";

  const studentLinks = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "My Exams", path: "/dashboard/exams", icon: <BookOpen size={18} /> },
    { name: "Practice", path: "/dashboard/practice", icon: <PenTool size={18} /> },
    { name: "Custom Test", path: "/dashboard/create-custom-quiz", icon: <Target size={18} /> },
    { name: "Results", path: "/dashboard/results", icon: <BarChart size={18} /> },
    { name: "Leaderboard", path: "/dashboard/leaderboard", icon: <Trophy size={18} /> },
    { name: "Help & Support", path: "/dashboard/help", icon: <HelpCircle size={18} /> },
    { name: "My Profile", path: "/dashboard/profile", icon: <User size={18} /> },
  ];

  const adminLinks = [
    { name: "Admin Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Manage Exams", path: "/admin/exams", icon: <Layers size={18} /> },
    { name: "Manage Quizzes", path: "/admin/manage-quizzes", icon: <FileText size={18} /> },
    { name: "Score Analytics", path: "/admin/score-analytics", icon: <BarChart size={18} /> },
    { name: "Flashcards", path: "/admin/flashcards", icon: <BookOpen size={18} /> },
    { name: "User Management", path: "/admin/users", icon: <Users size={18} /> },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const filteredLinks = links.filter(link => link.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleModalKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredLinks.length - 1 ? prev + 1 : prev));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
    if (e.key === "Enter" && filteredLinks.length > 0) {
      e.preventDefault();
      handleSelect(filteredLinks[selectedIndex].path);
    }
  };

  const handleSelect = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      <div className="search-trigger" onClick={() => setIsOpen(true)}>
        <Search size={16} className="search-trigger-icon" />
        <span className="search-trigger-text">Search...</span>
        <div className="search-trigger-shortcut">
          <Command size={12} /> K
        </div>
      </div>

      {isOpen && (
        <div className="search-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <Search size={20} className="search-modal-icon" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleModalKeyDown}
                className="search-modal-input"
              />
            </div>
            
            <div className="search-modal-results">
              <div className="search-modal-label">Navigate</div>
              {filteredLinks.length > 0 ? (
                filteredLinks.map((link, index) => (
                  <div
                    key={link.path}
                    className={`search-modal-item ${index === selectedIndex ? "selected" : ""}`}
                    onClick={() => handleSelect(link.path)}
                    
                  >
                    <div className="search-modal-item-icon">{link.icon}</div>
                    <span className="search-modal-item-text">{link.name}</span>
                  </div>
                ))
              ) : (
                <div className="search-modal-empty">No results found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UniversalSearch;
