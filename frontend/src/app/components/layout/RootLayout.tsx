import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
  Home,
  BookOpen,
  MessageSquare,
  User,
  Settings,
  Users,
  LayoutDashboard,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

export default function RootLayout() {
  const { t, theme, toggleTheme, language, setLanguage, user, logout, config } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const studentNavItems = [
    { path: '/', icon: Home, label: t('dashboard') },
    { path: '/courses', icon: BookOpen, label: t('courses') },
    { path: '/ai-assistant', icon: MessageSquare, label: t('aiAssistant') },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  const adminNavItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/admin/courses', icon: BookOpen, label: t('courseManagement') },
    { path: '/admin/students', icon: Users, label: t('students') },
    { path: '/admin/submissions', icon: FileText, label: t('submissions') },
  ];

  const navItems = user?.role === 'student' ? studentNavItems : adminNavItems;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-lg shadow-primary/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                {config.platformNameShort || 'EduLearn'}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'kk' | 'ru' | 'en')}
                className="hidden sm:block px-3 py-1.5 text-sm rounded-lg border border-border bg-background hover:bg-accent transition-colors cursor-pointer"
              >
                <option value="kk">ҚАЗ</option>
                <option value="ru">РУС</option>
                <option value="en">ENG</option>
              </select>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* Settings */}
              <Link
                to="/settings"
                className={`hidden sm:flex p-2 rounded-lg transition-colors ${
                  location.pathname === '/settings' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                }`}
              >
                <Settings className="w-4 h-4" />
              </Link>

              {/* User Menu */}
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm">{user?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    location.pathname === '/settings'
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>{t('settings')}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
