import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge label-caps inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a]:hover:opacity-90",
        secondary: "border-border bg-secondary text-secondary-foreground [a]:hover:bg-muted",
        outline: "border-input bg-transparent text-foreground [a]:hover:bg-muted",
        ghost: "border-transparent text-muted-foreground [a]:hover:bg-muted",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        /* Status fungsional */
        verified:
          "border-[color-mix(in_oklch,var(--status-verified),transparent_72%)] bg-[color-mix(in_oklch,var(--status-verified),transparent_90%)] text-[var(--status-verified)]",
        pending:
          "border-[color-mix(in_oklch,var(--status-pending),transparent_72%)] bg-[color-mix(in_oklch,var(--status-pending),transparent_90%)] text-[color-mix(in_oklch,var(--status-pending),black_10%)] dark:text-[var(--status-pending)]",
        restricted:
          "border-[color-mix(in_oklch,var(--status-restricted),transparent_72%)] bg-[color-mix(in_oklch,var(--status-restricted),transparent_90%)] text-[var(--status-restricted)]",
        destructive:
          "border-[color-mix(in_oklch,var(--destructive),transparent_72%)] bg-[color-mix(in_oklch,var(--destructive),transparent_90%)] text-destructive",
        info:
          "border-[color-mix(in_oklch,var(--status-info),transparent_72%)] bg-[color-mix(in_oklch,var(--status-info),transparent_90%)] text-[var(--status-info)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
