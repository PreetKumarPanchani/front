'use client';
import { useState, useEffect } from 'react';

const Sidebar = ({ activeSection, setActiveSection }) => {
  const [activeSecondary, setActiveSecondary] = useState(null);
  const [isMainPageActive, setIsMainPageActive] = useState(false);
  
  // Check if we're on the main page
  useEffect(() => {
    setIsMainPageActive(window.location.pathname === '/');
  }, []);
  
  const navItems = [
    { id: 'DayseAI', label: 'DayseAI' },
    //{ id: 'ASTTERI', label: 'ASTTERI' },
    //{ id: 'QubeChain', label: 'QubeChain' }
  ];
  
  const secondaryItems = [
    //{ id: 'suggestions', label: 'Suggestions', icon: 'bi-lightbulb' },
    //{ id: 'database', label: 'Data base', icon: 'bi-database' }
  ];

  const handleNavClick = (item) => {
    if (item.path) {
      window.location.href = item.path;
    } else {
      setActiveSection(item.id);
    }
  };

  const handleSecondaryClick = (id) => {
    setActiveSecondary(activeSecondary === id ? null : id);
  };

  const handleMainPageClick = () => {
    setIsMainPageActive(true);
    setActiveSection(null); // Deactivate other sections
    window.location.href = '/';
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <img src="/LQ_Icon.png" alt="Logo" className="logo-image" />
        <span className="logo-text">LIQUIDQUBE</span>
      </div>
      
      {/* Main navigation */}
      <div className="main-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            {item.label}
          </div>
        ))}
        
        {/* Main Page button with active styling only when clicked/active */}
        <div
          className={`nav-item ${isMainPageActive ? 'active' : ''}`}
          onClick={handleMainPageClick}
          style={{ 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Main Page
        </div>
      </div>
      
      {/* Secondary navigation with fixed position */}
      <div className="secondary-nav">
        {secondaryItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activeSecondary === item.id ? 'active' : ''}`}
            onClick={() => handleSecondaryClick(item.id)}
          >
            <i className={`bi ${item.icon} me-2`}></i>
            {item.label}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;