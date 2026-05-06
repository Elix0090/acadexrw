import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  GraduationCap,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Acadex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const user = useSession()!;

  const scope =
    user.role === "super_admin"
      ? db
      : {
          ...db,
          students: db.students.filter((s) => s.schoolId === user.schoolId),
          materials: db.materials.filter((m) => m.schoolId === user.schoolId),
          tracking: db.tracking.filter((t) => t.schoolId === user.schoolId),
          schools: db.schools.filter((s) => s.id === user.schoolId),
          classes: db.classes.filter((c) => c.schoolId === user.schoolId),
        };

  const completed = scope.tracking.filter((t) => t.status === "completed").length;
  const pending = scope.tracking.filter((t) => t.status === "pending").length;
  const overdue = scope.tracking.filter((t) => t.status === "overdue").length;
  const total = scope.tracking.length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  // 14-day trend
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const trend = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const items = scope.tracking.filter((t) => {
      const u = new Date(t.updatedAt);
      return u >= d && u < next;
    });
    return {
      day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      completed: items.filter((t) => t.status === "completed").length,
      pending: items.filter((t) => t.status === "pending").length,
      overdue: items.filter((t) => t.status === "overdue").length,
    };
  });

  const classBreakdown = scope.classes
    .map((c) => {
      const studentIds = scope.students.filter((s) => s.classId === c.id).map((s) => s.id);
      const items = scope.tracking.filter((t) => studentIds.includes(t.studentId));
      const cName =
        c.level.startsWith("L") && c.abbreviation ? `${c.level} ${c.abbreviation}` : c.level;
      return {
        name: cName,
        completed: items.filter((t) => t.status === "completed").length,
        pending: items.filter((t) => t.status === "pending").length,
        overdue: items.filter((t) => t.status === "overdue").length,
        total: items.length,
        rate: items.length
          ? Math.round((items.filter((t) => t.status === "completed").length / items.length) * 100)
          : 0,
      };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const recent = [...scope.tracking]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const studentsById = new Map(scope.students.map((s) => [s.id, s]));
  const materialsById = new Map(scope.materials.map((m) => [m.id, m]));

  const isEmpty = scope.students.length === 0 && scope.materials.length === 0;

  return (
    <div className="space-y-6">
      {/* Header — flat */}
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.role === "super_admin"
              ? `${db.schools.length} school${db.schools.length === 1 ? "" : "s"} · ${scope.students.length} students`
              : scope.schools[0]?.name ?? "Your school"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/reports">
              View reports
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/app/tracking">
              <Plus className="size-4" /> New tracking
            </Link>
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by adding students and materials.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" asChild>
              <Link to="/app/students">Add students</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/materials">Add materials</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Stat row — flat cards, single accent dot per metric */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
            <Stat
              label="Students"
              value={scope.students.length}
              icon={<Users className="size-4" />}
              accent="bg-[var(--chart-3)]"
              href="/app/students"
            />
            <Stat
              label="Materials"
              value={scope.materials.length}
              icon={<Package className="size-4" />}
              accent="bg-[var(--chart-2)]"
              href="/app/materials"
            />
            <Stat
              label="Classes"
              value={scope.classes.length}
              icon={<GraduationCap className="size-4" />}
              accent="bg-[var(--chart-5)]"
              href="/app/classes"
            />
            <Stat
              label="Completion"
              value={`${completionRate}%`}
              sub={`${completed} of ${total}`}
              icon={<Layers className="size-4" />}
              accent="bg-[var(--chart-1)]"
              href="/app/tracking"
            />
          </div>

          {/* Status strip */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatusTile
              label="Completed"
              value={completed}
              total={total}
              icon={<CheckCircle2 className="size-4" />}
              tone="success"
            />
            <StatusTile
              label="Pending"
              value={pending}
              total={total}
              icon={<Clock className="size-4" />}
              tone="warning"
            />
            <StatusTile
              label="Overdue"
              value={overdue}
              total={total}
              icon={<AlertTriangle className="size-4" />}
              tone="destructive"
            />
          </div>

          {/* Activity chart — full width, minimal */}
          <Panel
            title="Activity"
            subtitle="Tracking updates · last 14 days"
            action={
              <Link
                to="/app/reports"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Details →
              </Link>
            }
          >
            <div className="h-64 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    fill="url(#gComp)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    stroke="var(--chart-5)"
                    strokeWidth={1.5}
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="overdue"
                    stroke="var(--destructive)"
                    strokeWidth={1.5}
                    fill="transparent"
                    strokeDasharray="3 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
              <LegendDot color="var(--chart-2)" label="Completed" />
              <LegendDot color="var(--chart-5)" label="Pending" />
              <LegendDot color="var(--destructive)" label="Overdue" dashed />
            </div>
          </Panel>

          {/* Two columns */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Panel
              title="Top classes"
              subtitle="By tracking volume"
              className="lg:col-span-3"
            >
              {classBreakdown.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No class data yet.</div>
              ) : (
                <div className="h-64 px-2 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classBreakdown}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="completed" stackId="a" fill="var(--chart-2)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pending" stackId="a" fill="var(--chart-5)" />
                      <Bar dataKey="overdue" stackId="a" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Recent activity" className="lg:col-span-2">
              {recent.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No activity yet.</div>
              ) : (
                <ul className="divide-y">
                  {recent.map((t) => {
                    const s = studentsById.get(t.studentId);
                    const m = materialsById.get(t.materialId);
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            t.status === "completed"
                              ? "bg-success"
                              : t.status === "overdue"
                                ? "bg-destructive"
                                : "bg-warning"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {s?.name ?? "Student"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m?.name ?? "Material"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-normal capitalize">
                          {t.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="border-t px-4 py-2.5">
                <Link
                  to="/app/tracking"
                  className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  View all tracking
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({
  label,
  value,
  sub,
  icon,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex flex-col gap-3 bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={`size-1.5 rounded-full ${accent}`} />
          {label}
        </div>
        <span className="text-muted-foreground/60 group-hover:text-foreground">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </Link>
  );
}

function StatusTile({
  label,
  value,
  total,
  icon,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  tone: "success" | "warning" | "destructive";
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const barColor =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-destructive";
  const textColor =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-destructive";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs font-medium ${textColor}`}>
          {icon}
          {label}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border bg-card ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-3"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)`
            : color,
        }}
      />
      {label}
    </span>
  );
}
