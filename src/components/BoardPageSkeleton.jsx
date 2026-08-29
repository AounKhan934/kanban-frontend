import { Skeleton } from "./Skeleton";

const CARD_COUNTS = [3, 2, 4];

export default function BoardPageSkeleton({ columns = 3 }) {
  return (
    <div className="board-page__columns" aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <div className="skeleton-column" key={i}>
          <div className="skeleton-column__header">
            <Skeleton className="skeleton--line" style={{ width: "55%", height: 11 }} />
            <Skeleton className="skeleton--chip" />
          </div>
          {Array.from({ length: CARD_COUNTS[i % CARD_COUNTS.length] }).map((_, j) => (
            <div className="skeleton-card" key={j}>
              <Skeleton className="skeleton--line" style={{ width: `${80 - j * 8}%` }} />
              {j % 2 === 0 && (
                <Skeleton
                  className="skeleton--line skeleton--line-sm"
                  style={{ width: "45%" }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
