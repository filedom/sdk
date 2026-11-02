import { Show } from "solid-js";
import { ChevronDown, ChevronUp, Search } from "lucide-solid";
import { Button } from "@/components/filedom/button";
import { useAction, useFiledom } from "@/components/filedom/filedom-provider";
import { Input } from "@/components/filedom/input";
import { Tooltip } from "@/components/filedom/tooltip";

export function SearchBar() {
  const api = useFiledom();
  const search = useAction("search", "Search");
  const prev = useAction("findPrev", "Previous match");
  const next = useAction("findNext", "Next match");
  const query = () => api.snapshot()?.search.query ?? "";
  const count = () => {
    const hits = api.snapshot()?.search;
    if (!hits?.hitCount) return "0";
    return `${hits.hitIndex + 1} / ${hits.hitCount}`;
  };

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    api.store()?.run(event.shiftKey ? "findPrev" : "findNext");
  }

  return (
    <div data-slot="search-bar" class="flex items-center gap-0.5">
      <Show when={!search().hidden}>
        <div class="relative">
          <Search size={14} class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-slot="search-input"
            data-action="search"
            type="text"
            placeholder="Search"
            aria-label="Search"
            class="w-40 pl-7"
            value={query()}
            disabled={search().disabled}
            title={search().title}
            onInput={(event) => api.store()?.viewer.search(event.currentTarget.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </Show>
      <Show when={!prev().hidden}>
        <Tooltip label={prev().title ?? "Previous match"}>
          <Button
            variant="icon"
            data-slot="search-prev"
            data-action="findPrev"
            disabled={prev().disabled}
            title={prev().title}
            aria-label="Previous match"
            onClick={() => api.store()?.run("findPrev")}
          >
            <ChevronUp size={16} />
          </Button>
        </Tooltip>
      </Show>
      <span data-slot="search-count" class="min-w-12 px-1 text-center text-xs tabular-nums text-muted-foreground">
        {count()}
      </span>
      <Show when={!next().hidden}>
        <Tooltip label={next().title ?? "Next match"}>
          <Button
            variant="icon"
            data-slot="search-next"
            data-action="findNext"
            disabled={next().disabled}
            title={next().title}
            aria-label="Next match"
            onClick={() => api.store()?.run("findNext")}
          >
            <ChevronDown size={16} />
          </Button>
        </Tooltip>
      </Show>
    </div>
  );
}
