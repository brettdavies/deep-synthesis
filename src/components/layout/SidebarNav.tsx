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
import { useRecentBriefs } from '../../hooks/useRecentBriefs';
import { cn } from '@/lib/utils';

const SidebarNav: React.FC = () => {
  const location = useLocation();
  const [briefsExpanded, setBriefsExpanded] = useState(false);
  const { recentBriefs, loading } = useRecentBriefs(5);

  // Auto-expand briefs section when on briefs or brief detail page
  useEffect(() => {
    if (location.pathname === '/briefs' || location.pathname.startsWith('/brief/')) {
      setBriefsExpanded(true);
    }
  }, [location.pathname]);

  const toggleBriefsExpanded = () => {
    setBriefsExpanded(!briefsExpanded);
  };

  const isBriefActive = location.pathname === '/briefs' || 
    (recentBriefs.some(brief => location.pathname === `/brief/${brief.id}`));

  return (
    <nav className="flex flex-col h-full">
      {/* Main navigation items */}
      <div className="flex-1 p-4 space-y-2">
        <Link 
          to="/brief/new" 
          className="nav-link"
          aria-current={location.pathname === '/brief/new' ? 'page' : undefined}
        >
          <FontAwesomeIcon icon={faPlus} className="nav-icon" />
          New Brief
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
            onClick={toggleBriefsExpanded}
            className={cn(
              "nav-link w-full text-left flex items-center justify-between",
              isBriefActive && "bg-sidebar-active"
            )}
            aria-expanded={briefsExpanded}
          >
            <div className="flex items-center">
              <FontAwesomeIcon icon={faFileAlt} className="nav-icon" />
              Briefs
            </div>
            <FontAwesomeIcon 
              icon={briefsExpanded ? faChevronDown : faChevronRight} 
              className="h-3 w-3 transition-transform"
            />
          </button>
          
          {briefsExpanded && (
            <div className="pl-6 mt-1 space-y-1">
              <Link 
                to="/briefs" 
                className={cn(
                  "nav-link py-1.5 text-sm",
                  location.pathname === '/briefs' && "bg-sidebar-active"
                )}
              >
                <FontAwesomeIcon icon={faListAlt} className="nav-icon h-3 w-3" />
                All Briefs
              </Link>
              
              {!loading && recentBriefs.map(brief => (
                <Link 
                  key={brief.id}
                  to={`/brief/${brief.id}`}
                  className={cn(
                    "nav-link py-1.5 text-sm truncate",
                    location.pathname === `/brief/${brief.id}` && "bg-sidebar-active"
                  )}
                  title={brief.title}
                >
                  <span className="truncate block">{brief.title}</span>
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
        
        {/* Help link commented out temporarily
        <Link 
          to="/help" 
          className="nav-link"
          aria-current={location.pathname === '/help' ? 'page' : undefined}
        >
          <FontAwesomeIcon icon={faQuestionCircle} className="nav-icon" />
          Help
        </Link>
        */}
      </div>
    </nav>
  );
};

export default SidebarNav; 