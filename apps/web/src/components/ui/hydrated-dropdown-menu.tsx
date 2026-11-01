"use client";

import * as React from "react";
import { useHydrated } from "@/hooks/usHydrated";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * shadcn DropdownMenu that renders only its trigger (as a plain button with the
 * same props) until hydration finishes. Radix generates ids with useId, and the
 * header sits above trees that differ between server and client, so rendering
 * the full menu during hydration produces id-mismatch warnings.
 */
export function HydratedDropdownMenu({
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenu>) {
  const hydrated = useHydrated();
  if (hydrated) return <DropdownMenu {...props}>{children}</DropdownMenu>;

  const trigger = React.Children.toArray(children).find(
    (child): child is React.ReactElement<Record<string, unknown>> =>
      React.isValidElement(child) && child.type === DropdownMenuTrigger,
  );
  if (!trigger) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { asChild: _asChild, ...rest } = trigger.props as Record<string, unknown>;
  return <button type="button" data-state="closed" {...rest} />;
}
