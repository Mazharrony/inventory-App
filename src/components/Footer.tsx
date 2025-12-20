import { Link } from "react-router-dom";
import pkg from '../../package.json';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const appVersion = import.meta.env.VITE_APP_VERSION || `v${pkg.version}`;

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="text-center sm:text-left">
            © {currentYear} <span className="hidden sm:inline">JNK GENERAL TRADING LLC</span><span className="sm:hidden">JNK LLC</span>. All rights reserved. · {appVersion}
          </div>
          <div className="flex gap-4 sm:gap-6">
            <Link 
              to="/help" 
              className="hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation"
            >
              Help
            </Link>
            <Link 
              to="/profile" 
              className="hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation"
            >
              Profile
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
