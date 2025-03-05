import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faFile, 
  faFileAlt, 
  faCog, 
  faQuestionCircle,
  faChevronDown,
  faChevronRight,
  faListAlt
} from '@fortawesome/free-solid-svg-icons';
import { useRecentReports } from '../../hooks/useRecentReports';
import { cn } from '@/lib/utils';

const SidebarNav: React.FC = () => {
  const location = useLocation();
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const { recentReports, loading } = useRecentReports(5);

  // Auto-expand reports section when on reports or report detail page
  useEffect(() => {
    if (location.pathname === '/reports' || location.pathname.startsWith('/report/')) {
      setReportsExpanded(true);
    }
  }, [location.pathname]);

  const toggleReportsExpanded = () => {
    setReportsExpanded(!reportsExpanded);
  };

  const isReportActive = location.pathname === '/reports' || 
    (recentReports.some(report => location.pathname === `/report/${report.id}`));

  return (
    <nav className="flex flex-col h-full">
      {/* Main navigation items */}
      <div className="flex-1 p-4 space-y-2">
        <Link 
          to="/new-report" 
          className="nav-link"
          aria-current={location.pathname === '/new-report' ? 'page' : undefined}
        >
          <FontAwesomeIcon icon={faPlus} className="nav-icon" />
          New Report
        </Link>
        
        <Link 
          to="/papers" 
          className="nav-link"
          aria-current={location.pathname === '/papers' ? 'page' : undefined}
        >
          <FontAwesomeIcon icon={faFile} className="nav-icon" />
          Papers
        </Link>
        
        <div>
          <button 
            onClick={toggleReportsExpanded}
            className={cn(
              "nav-link w-full text-left flex items-center justify-between",
              isReportActive && "bg-sidebar-active"
            )}
            aria-expanded={reportsExpanded}
          >
            <div className="flex items-center">
              <FontAwesomeIcon icon={faFileAlt} className="nav-icon" />
              Reports
            </div>
            <FontAwesomeIcon 
              icon={reportsExpanded ? faChevronDown : faChevronRight} 
              className="h-3 w-3 transition-transform"
            />
          </button>
          
          {reportsExpanded && (
            <div className="pl-6 mt-1 space-y-1">
              <Link 
                to="/reports" 
                className={cn(
                  "nav-link py-1.5 text-sm",
                  location.pathname === '/reports' && "bg-sidebar-active"
                )}
              >
                <FontAwesomeIcon icon={faListAlt} className="nav-icon h-3 w-3" />
                All Reports
              </Link>
              
              {!loading && recentReports.map(report => (
                <Link 
                  key={report.id}
                  to={`/report/${report.id}`}
                  className={cn(
                    "nav-link py-1.5 text-sm truncate",
                    location.pathname === `/report/${report.id}` && "bg-sidebar-active"
                  )}
                  title={report.title}
                >
                  <span className="truncate block">{report.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom navigation items */}
      <div className="p-4 mt-auto space-y-2">
        <Link 
          to="/settings" 
          className="nav-link"
          aria-current={location.pathname === '/settings' ? 'page' : undefined}
        >
          <FontAwesomeIcon icon={faCog} className="nav-icon" />
          Settings
        </Link>
        
        <Link 
          to="/help" 
          className="nav-link"
          aria-current={location.pathname === '/help' ? 'page' : undefined}
        >
          <FontAwesomeIcon icon={faQuestionCircle} className="nav-icon" />
          Help
        </Link>
      </div>
    </nav>
  );
};

export default SidebarNav; 