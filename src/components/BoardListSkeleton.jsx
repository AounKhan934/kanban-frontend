import { Skeleton } from "./Skeleton";

export default function BoardListSkeleton({ count = 6 }) {
  return (
    <div className="board-list__grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-tile" key={i}>
          <Skeleton className="skeleton--icon" />
          <Skeleton className="skeleton--line" style={{ width: `${55 + ((i * 13) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}
