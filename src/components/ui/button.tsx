import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { actionSymbol } from "@/lib/action-label";
import { Plus, Save, X, Trash2, Pencil, Download, Upload, Send, RefreshCw, Filter, RotateCcw, Eye, CheckCircle2, Play, Star, FileText } from "@/components/ui/icons";

const actionIcons = { add: Plus, save: Save, close: X, delete: Trash2, edit: Pencil, download: Download, upload: Upload, send: Send, refresh: RefreshCw, filter: Filter, clear: RotateCcw, open: Eye, copy: FileText, check: CheckCircle2, play: Play, star: Star };

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        unstyled: "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50",
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        unstyled: "",
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, title, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const parts = React.Children.toArray(children);
    const plainText = parts.length > 0 && parts.every((part) => typeof part === "string" || typeof part === "number");
    const symbol = plainText ? actionSymbol(parts.join("")) : undefined;
    const ActionIcon = symbol ? actionIcons[symbol] : undefined;
    const styles = variant === "unstyled"
      ? "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50"
      : buttonVariants({ variant, size });
    return (
      <Comp className={cn(styles, className, ActionIcon && !asChild && "inline-flex items-center justify-center gap-2")} ref={ref} title={title ?? props["aria-label"]} {...props}>
        {ActionIcon && !asChild && <ActionIcon className="h-4 w-4 shrink-0" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
