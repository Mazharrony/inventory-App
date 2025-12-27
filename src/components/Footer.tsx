import { Link } from "react-router-dom";
import pkg from '../../package.json';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const appVersion = import.meta.env.VITE_APP_VERSION || `v${pkg.version}`;

  return (
    <footer className="border-t border-border/60 bg-card/95 backdrop-blur-sm mt-auto">
      <div className="px-3 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="text-center sm:text-left font-medium">
            © {currentYear} <span className="hidden sm:inline">JNK GENERAL TRADING LLC</span><span className="sm:hidden">JNK LLC</span>. All rights reserved. 
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-md font-semibold">{appVersion}</span>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <Link 
              to="/help" 
              className="hover:text-primary transition-all duration-200 min-h-[44px] flex items-center touch-manipulation hover:scale-105 font-medium"
            >
              Help
            </Link>
            <Link 
              to="/profile" 
              className="hover:text-primary transition-all duration-200 min-h-[44px] flex items-center touch-manipulation hover:scale-105 font-medium"
            >
              Profile
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
