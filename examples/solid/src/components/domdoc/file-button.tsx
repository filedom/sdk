import { Show } from "solid-js";
import { FolderOpen } from "lucide-solid";
import { Button } from "@/components/domdoc/button";
import { useAction, useDomdoc } from "@/components/domdoc/domdoc-provider";
import { Tooltip } from "@/components/domdoc/tooltip";

export function FileButton() {
  const api = useDomdoc();
  const open = useAction("open", "Open");
  let input: HTMLInputElement | undefined;

  function onChange() {
    const file = input?.files?.[0];
    if (input) input.value = "";
    if (file) void api.store()?.viewer.open(file);
  }

  return (
    <Show when={!open().hidden}>
      <>
        <Tooltip label={open().title ?? "Open"}>
          <Button
            variant="icon"
            data-slot="file-button"
            data-action="open"
            disabled={open().disabled}
            title={open().title}
            aria-label="Open"
            onClick={() => input?.click()}
          >
            <FolderOpen size={16} />
          </Button>
        </Tooltip>
        <input ref={input} type="file" class="sr-only" tabIndex={-1} aria-hidden="true" onChange={onChange} />
      </>
    </Show>
  );
}
