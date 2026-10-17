import { createContext, useContext, type Accessor } from "solid-js";

export interface DomdocSolidSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
}

export const DomdocSolidContext = createContext<Accessor<DomdocSolidSessionContext>>();

export function useDomdocSession(): DomdocSolidSessionContext {
  const ctx = useContext(DomdocSolidContext);
  if (!ctx) {
    throw new Error("useDomdocSession must be used within DomdocProvider");
  }
  return ctx();
}

export function createDomdocSolidSessionContext(sessionId: string): DomdocSolidSessionContext {
  return { sessionId, surface: "framework-adapter-stub" };
}

export function domdocSolidAdapterDemoSurface(sessionId: string): DomdocSolidSessionContext {
  return createDomdocSolidSessionContext(sessionId);
}
