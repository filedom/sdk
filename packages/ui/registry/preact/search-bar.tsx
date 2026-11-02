import type { TargetedEvent } from "preact";
import { ChevronDown, ChevronUp } from "lucide-preact";
import { Button } from "@/components/filedom/button";
import { useAction, useFiledom } from "@/components/filedom/filedom-provider";
import { Input } from "@/components/filedom/input";
import { Tooltip } from "@/components/filedom/tooltip";

export function SearchBar() {
  const { store, snapshot } = useFiledom();
  const search = useAction("search");
  const previous = useAction("findPrev");
  const next = useAction("findNext");
  const query = snapshot?.search.query ?? "";
  const hitCount = snapshot?.search.hitCount ?? 0;
  const hitIndex = snapshot?.search.hitIndex ?? -1;
  const count = hitCount > 0 ? `${hitIndex + 1}/${hitCount}` : "0";

  function onSubmit(event: TargetedEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("query");
    if (store && typeof value === "string") store.viewer.search(value);
  }

  if (search.hidden) return null;

  return (
    <form data-slot="search-bar" className="flex shrink-0 items-center gap-0.5" onSubmit={onSubmit}>
      <Input
        name="query"
        data-slot="search-input"
        data-action="search"
        value={query}
        disabled={search.disabled}
        title={search.title}
        placeholder="Search"
        aria-label="Search"
        className="w-36"
        onChange={(event) => {
          store?.viewer.search(event.currentTarget.value);
        }}
      />
      {previous.hidden ? null : (
        <Tooltip label={previous.title ?? "Previous match"}>
          <Button
            variant="icon"
            data-slot="search-prev"
            data-action="findPrev"
            disabled={previous.disabled}
            title={previous.title ?? "Previous match"}
            aria-label="Previous match"
            onClick={previous.run}
          >
            <ChevronUp className="size-4" />
          </Button>
        </Tooltip>
      )}
      {next.hidden ? null : (
        <Tooltip label={next.title ?? "Next match"}>
          <Button
            variant="icon"
            data-slot="search-next"
            data-action="findNext"
            disabled={next.disabled}
            title={next.title ?? "Next match"}
            aria-label="Next match"
            onClick={next.run}
          >
            <ChevronDown className="size-4" />
          </Button>
        </Tooltip>
      )}
      <span data-slot="search-count" className="min-w-10 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {count}
      </span>
    </form>
  );
}
