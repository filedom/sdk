import { InjectionToken, type Provider } from "@angular/core";

export interface DomdocAngularSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
}

export const DOMDOC_ANGULAR_SESSION = new InjectionToken<DomdocAngularSessionContext>(
  "domdoc-angular-session",
);

export function provideDomdocSession(sessionId: string): Provider {
  return {
    provide: DOMDOC_ANGULAR_SESSION,
    useValue: { sessionId, surface: "framework-adapter-stub" },
  };
}

export function domdocAngularAdapterDemoSurface(sessionId: string): DomdocAngularSessionContext {
  return { sessionId, surface: "framework-adapter-stub" };
}
