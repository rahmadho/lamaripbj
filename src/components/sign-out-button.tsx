"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="size-4" aria-hidden="true" />
      Keluar
    </Button>
  );
}
