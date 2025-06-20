import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  TrendingUp, 
  Package, 
  ShoppingBag, 
  Menu, 
  X, 
  ChevronDown,
  Settings,
  Home,
  LogOut,
  Calendar,
  Cloud,
  Upload,
  Warehouse,
} from 'lucide-react';

const AppLayout = ({ children }) => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('');
  const [isMainPageActive, setIsMainPageActive] = useState(false);
  
  // Determine active company from URL or default to forge
  const getActiveCompany = () => {
    const path = router.asPath;
    if (path.includes('/cpl')) return 'cpl';
    return 'forge';
  };
  
  const activeCompany = getActiveCompany();

  const navigation = [
    { name: 'Dashboard', href: `/dashboard/${activeCompany}`, icon: Home },
    { name: 'Forecasts', href: `/forecasts/${activeCompany}`, icon: TrendingUp },
    { name: 'Products', href: `/products/${activeCompany}`, icon: Package },
    { name: 'Categories', href: `/categories/${activeCompany}`, icon: ShoppingBag },
    { name: 'Upload Data', href: `/upload/${activeCompany}`, icon: Upload },
    { name: 'Main Page', href: '/', icon: Warehouse },
  ];
  
  // Check which nav item is active on page load and route changes
  useEffect(() => {
    const path = router.asPath;
    
    // Check if we're on the main page
    if (path === '/') {
      setIsMainPageActive(true);
      setActiveNav('/');
      return;
    }
    
    // Set active based on current route
    const basePath = `/${path.split('/')[1]}`;
    setActiveNav(basePath);
    setIsMainPageActive(false);
  }, [router.asPath]);
  
  // Handle nav item clicks
  const handleNavClick = (href) => {
    if (href === '/') {
      setIsMainPageActive(true);
      setActiveNav('/');
    } else {
      setActiveNav(href);
      setIsMainPageActive(false);
    }
  };
  
  // Determine if a nav item is active
  const isActive = (href) => {
    if (href === '/' && isMainPageActive) return true;
    
    const basePath = `/${router.asPath.split('/')[1]}`;
    return href.startsWith(basePath) && href !== '/';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Mobile menu */}
      <div className="lg:hidden">
        <div className="fixed inset-0 flex z-40">
          {/* Mobile menu backdrop */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
          )}
          
          {/* Mobile menu sidebar */}
          <div 
            className={`
              fixed inset-y-0 left-0 flex flex-col w-64 transform transition duration-300 ease-in-out
              ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center">
                <img src="/LQ_Icon.png" alt="Logo" className="h-8 w-8" />
                <span className="ml-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>LIQUIDQUBE</span>
              </div>
              <button 
                className="hover:text-opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-2 py-4">
              {/* Company selector */}
              <div className="px-3 mb-4">
                <button
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md"
                  style={{ 
                    color: 'var(--text-primary)', 
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)'
                  }}
                  onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                >
                  <div className="flex items-center">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    <span className="capitalize">{activeCompany}</span>
                  </div>
                  <ChevronDown className={`ml-1 h-4 w-4 transform ${companyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {companyDropdownOpen && (
                  <div className="mt-1 rounded-md py-1" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <Link 
                      href={`/dashboard/forge`}
                      className={`block px-4 py-2 text-sm hover:bg-opacity-10 hover:bg-white ${
                        activeCompany === 'forge' 
                          ? 'text-yellow-400 bg-opacity-10 bg-yellow-400' 
                          : 'text-gray-300'
                      }`}
                      onClick={() => {
                        setCompanyDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Forge
                    </Link>
                    <Link 
                      href={`/dashboard/cpl`}
                      className={`block px-4 py-2 text-sm hover:bg-opacity-10 hover:bg-white ${
                        activeCompany === 'cpl' 
                          ? 'text-yellow-400 bg-opacity-10 bg-yellow-400' 
                          : 'text-gray-300'
                      }`}
                      onClick={() => {
                        setCompanyDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      CPL
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Navigation items */}
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                      ${isActive(item.href) 
                        ? 'nav-active' 
                        : 'hover:bg-opacity-5 hover:bg-white'
                      }
                    `}
                    style={{ 
                      color: isActive(item.href) ? 'var(--accent-primary)' : 'var(--text-secondary)'
                    }}
                    onClick={() => {
                      handleNavClick(item.href);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <item.icon 
                      className={`
                        mr-3 h-5 w-5 transition-colors duration-200
                        ${isActive(item.href) ? 'text-yellow-400' : 'group-hover:text-gray-300'}
                      `} 
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:flex-col lg:w-64 lg:z-50">
        <div className="flex flex-col flex-1 min-h-0" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center h-16 px-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <img src="/LQ_Icon.png" alt="Logo" className="h-7 w-7" />
            <span className="ml-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>LIQUIDQUBE</span>
          </div>
          
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Company selector */}
            <div className="px-3 mb-6">
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 hover:bg-opacity-10 hover:bg-white"
                style={{ 
                  color: 'var(--text-primary)', 
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)'
                }}
                onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
              >
                <div className="flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  <span className="capitalize">{activeCompany}</span>
                </div>
                <ChevronDown className={`ml-1 h-4 w-4 transform transition-transform duration-200 ${companyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {companyDropdownOpen && (
                <div className="mt-1 rounded-md py-1 absolute z-10 w-52" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
                  <Link 
                    href={`/dashboard/forge`}
                    className={`block px-4 py-2 text-sm transition-colors duration-200 ${
                      activeCompany === 'forge' 
                        ? 'bg-opacity-10 bg-yellow-400 text-yellow-400' 
                        : 'text-gray-300 hover:bg-opacity-10 hover:bg-white'
                    }`}
                    onClick={() => setCompanyDropdownOpen(false)}
                  >
                    Forge
                  </Link>
                  <Link 
                    href={`/dashboard/cpl`}
                    className={`block px-4 py-2 text-sm transition-colors duration-200 ${
                      activeCompany === 'cpl' 
                        ? 'bg-opacity-10 bg-yellow-400 text-yellow-400' 
                        : 'text-gray-300 hover:bg-opacity-10 hover:bg-white'
                    }`}
                    onClick={() => setCompanyDropdownOpen(false)}
                  >
                    CPL
                  </Link>
                </div>
              )}
            </div>
            
            {/* Navigation */}
            <nav className="px-3 space-y-1">
              {navigation.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${isActive(item.href) 
                      ? 'nav-active' 
                      : 'hover:bg-opacity-5 hover:bg-white'
                    }
                  `}
                  style={{ 
                    color: isActive(item.href) ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                  onClick={() => handleNavClick(item.href)}
                >
                  <item.icon 
                    className={`
                      mr-3 h-5 w-5 transition-colors duration-200
                      ${isActive(item.href) ? 'text-yellow-400' : 'group-hover:text-gray-300'}
                    `} 
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 shadow-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <button
            className="lg:hidden px-4 focus:outline-none hover:bg-opacity-10 hover:bg-white transition-colors duration-200"
            style={{ 
              borderRight: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)' 
            }}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Sales Forecast
              </h1>
            </div>
          </div>
        </div>
        

        {/* Main content area */}
        <main className="flex-1">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;