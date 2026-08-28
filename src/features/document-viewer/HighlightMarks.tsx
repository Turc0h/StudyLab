import type { HighlightRecord } from "../../db/db";

interface HighlightMarksProps {
  highlights: HighlightRecord[];
  pageSize: { width: number; height: number };
}

export function HighlightMarks({ highlights, pageSize }: HighlightMarksProps) {
  return (
    <>
      {highlights.flatMap((h) =>
        h.rects.map((r, i) => (
          <div
            key={`${h.id}-${i}`}
            className="pointer-events-none absolute bg-accent/35 mix-blend-multiply"
            style={{
              left: r.x * pageSize.width,
              top: r.y * pageSize.height,
              width: r.width * pageSize.width,
              height: r.height * pageSize.height,
            }}
          />
        )),
      )}
    </>
  );
}
