import { useFiledom } from "@/components/filedom/filedom-provider";

export function PageStatus() {
  const { snapshot } = useFiledom();
  const doc = snapshot?.document;
  const label =
    snapshot?.status === "loading"
      ? "Opening…"
      : doc
        ? `${doc.name ?? "Untitled"} · ${doc.pageCount} ${doc.pageCount === 1 ? "page" : "pages"}`
        : "No document";
  return (
    <p data-slot="page-status" className="max-w-48 truncate px-1 text-xs text-muted-foreground" title={label}>
      {label}
    </p>
  );
}
