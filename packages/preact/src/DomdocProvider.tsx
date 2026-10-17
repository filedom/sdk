import { createContext, type ComponentChildren } from "preact";
import { useContext } from "preact/hooks";

export interface DomdocPreactSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
}

const DomdocContext = createContext<DomdocPreactSessionContext | null>(null);

export function DomdocProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ComponentChildren;
}) {
  return (
    <DomdocContext.Provider value={{ sessionId, surface: "framework-adapter-stub" }}>
      {children}
    </DomdocContext.Provider>
  );
}

export function useDomdocSession(): DomdocPreactSessionContext {
  const ctx = useContext(DomdocContext);
  if (!ctx) {
    throw new Error("useDomdocSession must be used within DomdocProvider");
  }
  return ctx;
}

export function domdocPreactAdapterDemoSurface(sessionId: string): DomdocPreactSessionContext {
  return { sessionId, surface: "framework-adapter-stub" };
}
