import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { staggerContainer, staggerItem } from "@/lib/motion";

/** Motion-wrapped grid/list with stagger for skeleton children */
function Stagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Item({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/** KPI cards row (4 columns) */
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <div className="flex items-start justify-between">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
          <Skeleton className="mt-5 h-3 w-24" />
          <Skeleton className="mt-2 h-7 w-32" />
        </Item>
      ))}
    </Stagger>
  );
}

/** Generic chart card placeholder */
export function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="h-72 p-6">
        <Skeleton variant="shine" className="h-full w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Table rows skeleton */
export function TableRowsSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-5 py-3.5">
              {c === 0 ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-40" />
                  </div>
                </div>
              ) : (
                <Skeleton className={`h-3 ${c % 2 === 0 ? "w-20" : "w-16"}`} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** List items (e.g., activities, insights) */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="divide-y divide-border"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <motion.li variants={staggerItem} key={i} className="flex gap-3 px-6 py-3.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/** Card grid (clients, automations) */
export function CardGridSkeleton({ count = 6, cols = "md:grid-cols-2 xl:grid-cols-3" }: { count?: number; cols?: string }) {
  return (
    <Stagger className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <div className="flex items-start justify-between">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </Item>
      ))}
    </Stagger>
  );
}

/** Pipeline kanban columns */
export function KanbanSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-4 md:-mx-8 md:px-8">
      <Stagger className="flex gap-4">
        {Array.from({ length: columns }).map((_, c) => (
          <Item key={c} className="flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-surface-1/60">
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-6 rounded-md" />
              </div>
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <div className="border-b border-border px-3 py-2">
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex flex-col gap-2 p-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface-2 p-3.5">
                  <div className="mb-2 flex items-start justify-between">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-2.5 w-3/4" />
                  <div className="mt-3 flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-6 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </Item>
        ))}
      </Stagger>
    </div>
  );
}

/** Insights / feature cards (3-up) */
export function FeatureCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Stagger className="grid gap-5 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-5/6" />
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
        </Item>
      ))}
    </Stagger>
  );
}

/** Automation row skeleton */
export function AutomationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Stagger className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </Item>
      ))}
    </Stagger>
  );
}

/** Task list skeleton (two columns) */
export function TaskGroupsSkeleton() {
  return (
    <Stagger className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, g) => (
        <Item key={g} className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-6 rounded-md" />
            </div>
          </div>
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </li>
            ))}
          </ul>
        </Item>
      ))}
    </Stagger>
  );
}
