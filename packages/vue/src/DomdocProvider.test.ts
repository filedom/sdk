import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import {
  DomdocProvider,
  domdocVueAdapterDemoSurface,
  useDomdocSession,
} from "./DomdocProvider.js";

const SessionLabel = defineComponent({
  setup() {
    const { sessionId, surface } = useDomdocSession();
    return () => h("span", { "data-testid": "session" }, `${sessionId}:${surface}`);
  },
});

describe("@domdoc/vue framework adapter stub (M5)", () => {
  it("provides session context through DomdocProvider", () => {
    const wrapper = mount(DomdocProvider, {
      props: { sessionId: "demo-sess" },
      slots: { default: () => h(SessionLabel) },
    });
    expect(wrapper.get("[data-testid=session]").text()).toBe("demo-sess:framework-adapter-stub");
  });

  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocVueAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
  });
});
