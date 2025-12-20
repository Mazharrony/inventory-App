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
    const defaultClassName = "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-primary/15 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px] touch-manipulation";
    const defaultActiveClassName = "bg-primary/20 text-primary font-semibold shadow-sm";
    
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            defaultClassName,
            className, 
            isActive && (activeClassName || defaultActiveClassName), 
            isPending && pendingClassName
          )
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
