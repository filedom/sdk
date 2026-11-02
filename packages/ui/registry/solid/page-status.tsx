import { useFiledom } from "@/components/filedom/filedom-provider";

export function PageStatus() {
  const api = useFiledom();
  const label = () => {
    const doc = api.snapshot()?.document;
    if (!doc) return "No document";
    const pages = doc.pageCount === 1 ? "1 page" : `${doc.pageCount} pages`;
    return `${doc.name ?? "Document"} · ${pages}`;
  };

  return (
    <p data-slot="page-status" class="max-w-[40%] truncate text-xs text-muted-foreground">
      {label()}
    </p>
  );
}
