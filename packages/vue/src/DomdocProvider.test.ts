import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import {
  DomdocProvider,
  domdocVueAdapterDemoSurface,
  useDomdocSession,
} from "./DomdocProvider.js";
import {
  domdocVueLazyFeatureManifestStub,
  domdocVueLazyFeatureManifestSchemaVersion,
  listDomdocVueLazyFeatureHostExamples,
} from "./lazy-feature-manifest.js";

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

  it("re-exports lazy feature manifest stub for host parity (M5/G5)", () => {
    expect(domdocVueLazyFeatureManifestSchemaVersion).toBe(1);
    expect(domdocVueLazyFeatureManifestStub.gateStatus).toBe("not-run");
    expect(listDomdocVueLazyFeatureHostExamples()).toContain("vue");
  });
});
