import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Spinner from "../Spinner";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-lift active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-modern hover:shadow-modern-lg hover:brightness-110",
        destructive: "bg-gradient-destructive text-destructive-foreground shadow-modern hover:shadow-modern-lg hover:brightness-110",
        outline: "border border-input bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:text-primary hover:border-primary",
        secondary: "bg-gradient-secondary text-secondary-foreground shadow-modern hover:shadow-modern-lg hover:brightness-110",
        ghost: "hover:bg-primary/15 hover:text-primary transition-colors",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary hover:brightness-125",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        disabled={disabled || isLoading}
        {...props} 
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="text-current" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
