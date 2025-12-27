

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Home, BarChart3, Package, Settings, Users, Store, Menu, HelpCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export function AppHeader({ title, subtitle, icon }: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, isAdmin, signOut, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNavClick = () => {
    setIsOpen(false);
  };

  // Force admin check for specific username
  const isKamalAdmin = user?.username === 'kamal' || user?.id === 'hello@meetmazhar.site';
  const shouldShowSettings = isAdmin || isKamalAdmin;
  const { isAccountant } = useAuth();
  const shouldShowInventory = isAdmin || isKamalAdmin || isAccountant;

  // Shorten company name on mobile
  const displayTitle = title === "JNK GENERAL TRADING LLC" ? (
    <>
      <span className="hidden sm:inline">{title}</span>
      <span className="sm:hidden">JNK LLC</span>
    </>
  ) : title;

  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border/60 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex justify-between items-center gap-2">
          {/* Logo and Title */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/90 p-2 flex-shrink-0 cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
              aria-label="Go to home"
            >
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground drop-shadow-sm" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg md:text-xl font-bold text-primary truncate bg-gradient-to-r from-primary to-primary/70 bg-clip-text">{displayTitle}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block font-medium">{subtitle}</p>
              {userRole && (
                <div className="inline-flex items-center gap-1 mt-0.5">
                  <span className={cn(
                    "text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md",
                    userRole === 'admin' && "bg-primary/10 text-primary",
                    userRole === 'accounts' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    userRole === 'seller' && "bg-success/10 text-success"
                  )}>
                    {userRole === 'admin' ? "Admin" :
                     userRole === 'accounts' ? "Accounts" :
                     "Seller"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex gap-2 animate-slide-in-right">
            <NavLink to="/">
              <Home className="h-4 w-4 icon-bounce" />
              Dashboard
            </NavLink>
            <NavLink to="/analytics">
              <BarChart3 className="h-4 w-4 icon-bounce" />
              Analytics
            </NavLink>
            {shouldShowInventory && (
              <NavLink to="/inventory">
                <Package className="h-4 w-4 icon-bounce" />
                Inventory
              </NavLink>
            )}
            {shouldShowSettings && (
              <NavLink to="/settings">
                <Settings className="h-4 w-4 icon-bounce" />
                Settings
              </NavLink>
            )}
            <NavLink to="/profile">
              <Users className="h-4 w-4 icon-bounce" />
              Profile
            </NavLink>
            <NavLink to="/help">
              <HelpCircle className="h-4 w-4 icon-bounce" />
              Help
            </NavLink>
            <Button variant="outline" onClick={handleSignOut} className="hover-lift">
              <LogOut className="h-4 w-4 mr-2 icon-bounce" />
              Sign Out
            </Button>
          </nav>

          {/* Mobile Navigation - Hamburger Menu */}
          <div className="flex lg:hidden items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-3 mt-6">
                  <NavLink 
                    to="/" 
                    onClick={handleNavClick}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-base font-medium"
                  >
                    <Home className="h-5 w-5" />
                    Dashboard
                  </NavLink>
                  <NavLink 
                    to="/analytics" 
                    onClick={handleNavClick}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-base font-medium"
                  >
                    <BarChart3 className="h-5 w-5" />
                    Analytics
                  </NavLink>
                  {shouldShowInventory && (
                    <NavLink 
                      to="/inventory" 
                      onClick={handleNavClick}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-base font-medium"
                    >
                      <Package className="h-5 w-5" />
                      Inventory
                    </NavLink>
                  )}
                  {shouldShowSettings && (
                    <NavLink 
                      to="/settings" 
                      onClick={handleNavClick}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-base font-medium"
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </NavLink>
                  )}
                  <NavLink 
                    to="/profile" 
                    onClick={handleNavClick}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-base font-medium"
                  >
                    <Users className="h-5 w-5" />
                    Profile
                  </NavLink>
                  <NavLink 
                    to="/help" 
                    onClick={handleNavClick}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-base font-medium"
                  >
                    <HelpCircle className="h-5 w-5" />
                    Help
                  </NavLink>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
