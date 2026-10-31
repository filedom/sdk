import { createViewer, type DomdocViewer as Viewer, type ViewerOptions } from "@domdoc/core";
import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from "vue";

export type { Viewer, ViewerOptions };

/** `<DomdocViewer :options="options" @ready="(viewer) => ..." />` */
export const DomdocViewer = defineComponent({
  name: "DomdocViewer",
  props: {
    options: { type: Object as PropType<ViewerOptions>, required: true },
  },
  emits: { ready: (_viewer: Viewer) => true },
  setup(props, { emit, expose }) {
    const host = ref<HTMLDivElement>();
    const viewer = shallowRef<Viewer>();
    const mount = () => {
      viewer.value?.destroy();
      viewer.value = createViewer(host.value!, props.options);
      emit("ready", viewer.value);
    };
    onMounted(mount);
    watch(() => props.options, mount);
    onBeforeUnmount(() => viewer.value?.destroy());
    expose({ viewer });
    return () => h("div", { ref: host, style: { height: "100%" } });
  },
});
