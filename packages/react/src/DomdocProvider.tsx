import { createContext, useContext, type ReactNode } from "react";

export interface DomdocReactSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
}

const DomdocContext = createContext<DomdocReactSessionContext | null>(null);

export function DomdocProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  return (
    <DomdocContext.Provider value={{ sessionId, surface: "framework-adapter-stub" }}>
      {children}
    </DomdocContext.Provider>
  );
}

export function useDomdocSession(): DomdocReactSessionContext {
  const ctx = useContext(DomdocContext);
  if (!ctx) {
    throw new Error("useDomdocSession must be used within DomdocProvider");
  }
  return ctx;
}

/** Demo shell metadata without mounting React (vanilla demo imports this). */
export function domdocReactAdapterDemoSurface(sessionId: string): DomdocReactSessionContext {
  return { sessionId, surface: "framework-adapter-stub" };
}
