import React from "react";
import { cn } from "@/lib/utils";
import "./skeleton.css";

/**
 * Base Skeleton block with smooth shimmer effect.
 */
export function Skeleton({ className, style, width, height, circle, rounded, ...props }) {
  const inlineStyles = {
    ...(width ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    ...(circle ? { borderRadius: "50%", aspectRatio: "1/1" } : rounded ? { borderRadius: typeof rounded === "number" ? `${rounded}px` : rounded } : {}),
    ...style,
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading..."
      className={cn("prepmark-skeleton", className)}
      style={inlineStyles}
      {...props}
    />
  );
}

/**
 * Skeleton for multiline text blocks.
 */
export function SkeletonText({ lines = 3, gap = 8, lastLineWidth = "60%", lineHeight = 14, className, style, ...props }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex flex-col", className)}
      style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, ...style }}
      {...props}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          style={{
            width: i === lines - 1 ? lastLineWidth : "100%",
            borderRadius: "4px",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for avatar icons.
 */
export function SkeletonAvatar({ size = 40, className, style, ...props }) {
  return (
    <Skeleton
      circle
      width={size}
      height={size}
      className={className}
      style={{ flexShrink: 0, ...style }}
      {...props}
    />
  );
}

/**
 * Skeleton Stat Card for Dashboards (Student & Admin).
 */
export function SkeletonStatCard({ className, style, ...props }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("skeleton-stat-card", className)}
      style={style}
      {...props}
    >
      <Skeleton width={44} height={44} rounded={12} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        <Skeleton width="45%" height={22} rounded={6} />
        <Skeleton width="70%" height={12} rounded={4} />
      </div>
    </div>
  );
}

/**
 * Skeleton for Exam / Quiz Series Cards (matches MyExams, Practice, LiveExam cards).
 */
export function SkeletonExamCard({ className, style, ...props }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("skeleton-card-container", className)}
      style={style}
      {...props}
    >
      {/* Header Badge & Category */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width={80} height={22} rounded={20} />
        <Skeleton width={60} height={14} rounded={4} />
      </div>

      {/* Title & Subtitle */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "4px 0" }}>
        <Skeleton width="85%" height={18} rounded={6} />
        <Skeleton width="55%" height={13} rounded={4} />
      </div>

      {/* Meta Chips Grid (Duration, Questions, Marks) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          padding: "10px 12px",
          borderRadius: "10px",
          background: "rgba(0,0,0,0.02)",
          border: "1px solid var(--border-color)",
        }}
      >
        <Skeleton width="75%" height={14} rounded={4} />
        <Skeleton width="65%" height={14} rounded={4} />
        <Skeleton width="60%" height={14} rounded={4} />
        <Skeleton width="70%" height={14} rounded={4} />
      </div>

      {/* Footer CTA Button */}
      <Skeleton width="100%" height={40} rounded={10} style={{ marginTop: "4px" }} />
    </div>
  );
}

/**
 * Skeleton Table (Admin tables, Users, Reports, Reminders, Quizzes).
 */
export function SkeletonTable({ rows = 5, columns = 4, className, style, ...props }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("skeleton-table-wrapper", className)}
      style={style}
      {...props}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          borderBottom: "1.5px solid var(--border-color)",
          gap: "16px",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton
            key={c}
            height={14}
            style={{
              flex: c === 0 ? 1.5 : 1,
              maxWidth: c === 0 ? "240px" : "160px",
              borderRadius: "4px",
            }}
          />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              style={{
                flex: c === 0 ? 1.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: 0,
              }}
            >
              {c === 0 && <Skeleton circle width={32} height={32} style={{ flexShrink: 0 }} />}
              <Skeleton
                height={14}
                style={{
                  width: c === 0 ? "65%" : c === columns - 1 ? "40px" : "60%",
                  borderRadius: "4px",
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * General Skeleton Card wrapper.
 */
export function SkeletonCard({ children, className, style, ...props }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("skeleton-card-container", className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export default Skeleton;
