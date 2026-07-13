import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface Props {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: Props) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <main
        className={`flex-1 px-4 ${showNav ? "" : ""}`}
        style={{
          paddingTop: "calc(1.5rem + env(safe-area-inset-top))",
          paddingBottom: showNav
            ? "calc(7rem + env(safe-area-inset-bottom))"
            : "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
