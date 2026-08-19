import "./Skeleton.css";

interface SkeletonProps {
  width?: string;
  height?: string;
}

export function Skeleton({ width = "100%", height = "13px" }: SkeletonProps) {
  return <span className="skeleton-block" style={{ width, height }} />;
}
