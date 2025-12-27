import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const defaultClassName = "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px] touch-manipulation relative group";
    const defaultActiveClassName = "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold shadow-sm border-l-2 border-primary";
    
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            defaultClassName,
            className, 
            isActive && (activeClassName || defaultActiveClassName), 
            isPending && pendingClassName,
            "before:absolute before:inset-0 before:bg-primary/5 before:opacity-0 before:transition-opacity hover:before:opacity-100 before:rounded-lg"
          )
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
