import { defineComponent, inject, provide, type InjectionKey, type PropType } from "vue";

export interface DomdocVueSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
}

const DomdocContextKey: InjectionKey<DomdocVueSessionContext> = Symbol("domdoc-vue-session");

export const DomdocProvider = defineComponent({
  name: "DomdocProvider",
  props: {
    sessionId: { type: String as PropType<string>, required: true },
  },
  setup(props, { slots }) {
    provide(DomdocContextKey, { sessionId: props.sessionId, surface: "framework-adapter-stub" });
    return () => slots.default?.();
  },
});

export function useDomdocSession(): DomdocVueSessionContext {
  const ctx = inject(DomdocContextKey);
  if (!ctx) {
    throw new Error("useDomdocSession must be used within DomdocProvider");
  }
  return ctx;
}

export function domdocVueAdapterDemoSurface(sessionId: string): DomdocVueSessionContext {
  return { sessionId, surface: "framework-adapter-stub" };
}
