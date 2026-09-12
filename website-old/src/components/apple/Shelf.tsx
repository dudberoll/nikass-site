import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

type ShelfProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
  itemClassName?: string;
};

export default function Shelf({ eyebrow, title, children, className = "", itemClassName = "" }: ShelfProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const carouselId = `carousel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateEdges = () => {
    const row = rowRef.current;
    if (!row) return;
    setCanPrev(row.scrollLeft > 8);
    setCanNext(row.scrollLeft + row.clientWidth < row.scrollWidth - 8);
  };

  useEffect(() => {
    updateEdges();
    const row = rowRef.current;
    if (!row) return;
    row.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, []);

  const scroll = (direction: number) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({ left: direction * Math.max(row.clientWidth * 0.78, 340), behavior: "smooth" });
  };

  return (
    <section className={`apple-shelf ${className}`}>
      <div className="shelf-header">
        <p className="shelf-eyebrow">{eyebrow ?? ""}</p>
        <h2>{title}</h2>
        <div className="shelf-arrows" aria-label={`${title} carousel controls`} role="group">
          <button aria-controls={carouselId} aria-label={`Previous ${title}`} disabled={!canPrev} onClick={() => scroll(-1)} type="button"><ChevronLeft size={20} /></button>
          <button aria-controls={carouselId} aria-label={`Next ${title}`} disabled={!canNext} onClick={() => scroll(1)} type="button"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div aria-label={title} className={`shelf-row ${itemClassName}`} id={carouselId} ref={rowRef} role="region" aria-roledescription="carousel">{children}</div>
    </section>
  );
}
