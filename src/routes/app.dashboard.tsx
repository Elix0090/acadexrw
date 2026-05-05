import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Trophy,
  Award,
  Bell,
  Calendar,
  ThumbsUp,
  FileBarChart,
  ClipboardCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
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

  // Activity over last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const trend = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayItems = scope.tracking.filter((t) => {
      const u = new Date(t.updatedAt);
      return u >= d && u < next;
    });
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      completed: dayItems.filter((t) => t.status === "completed").length,
      pending: dayItems.filter((t) => t.status === "pending").length,
      total: dayItems.length,
    };
  });

  const statusData = [
    { name: "Completed", value: completed, color: "var(--success)" },
    { name: "Pending", value: pending, color: "var(--warning)" },
    { name: "Overdue", value: overdue, color: "var(--destructive)" },
  ].filter((d) => d.value > 0);

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
      };
    })
    .sort(
      (a, b) =>
        b.completed + b.pending + b.overdue - (a.completed + a.pending + a.overdue),
    )
    .slice(0, 6);

  const classRanking = scope.classes
    .map((c) => {
      const studentIds = scope.students.filter((s) => s.classId === c.id).map((s) => s.id);
      const items = scope.tracking.filter((t) => studentIds.includes(t.studentId));
      const done = items.filter((t) => t.status === "completed").length;
      const cName =
        c.level.startsWith("L") && c.abbreviation
          ? `${c.level} ${c.abbreviation}`
          : c.level.startsWith("L") && c.trade
            ? `${c.level} ${c.trade}`
            : c.level;
      return {
        name: cName,
        total: items.length,
        completed: done,
        rate: items.length ? Math.round((done / items.length) * 100) : 0,
      };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed);
  const topClass = classRanking[0];

  const tradeMap = new Map<string, { total: number; completed: number }>();
  for (const c of scope.classes) {
    const trade = c.trade?.trim();
    if (!trade) continue;
    const studentIds = scope.students.filter((s) => s.classId === c.id).map((s) => s.id);
    const items = scope.tracking.filter((t) => studentIds.includes(t.studentId));
    const done = items.filter((t) => t.status === "completed").length;
    const prev = tradeMap.get(trade) ?? { total: 0, completed: 0 };
    tradeMap.set(trade, { total: prev.total + items.length, completed: prev.completed + done });
  }
  const tradeRanking = Array.from(tradeMap.entries())
    .map(([name, v]) => ({
      name,
      total: v.total,
      completed: v.completed,
      rate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
    }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed);
  const topTrade = tradeRanking[0];

  const recent = [...scope.tracking]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const isEmpty = scope.students.length === 0 && scope.materials.length === 0;

  // Risk gauge (lower completion = higher risk, scaled to 20)
  const riskScore = Math.max(1, Math.round(((100 - completionRate) / 100) * 20));
  const riskLabel = riskScore <= 7 ? "Low" : riskScore <= 14 ? "Balanced" : "High";
  const riskTone =
    riskScore <= 7 ? "text-success" : riskScore <= 14 ? "text-primary" : "text-destructive";
  const riskColor =
    riskScore <= 7 ? "var(--success)" : riskScore <= 14 ? "var(--primary)" : "var(--destructive)";

  // Mini stat sparkline data (reuse trend)
  const visitsSpark = trend.map((t) => ({ v: t.total }));
  const bounceSpark = trend.map((t) => ({ v: t.pending }));
  const productsSpark = trend.map((t) => ({ v: t.completed }));

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-[var(--shadow-elegant)] sm:p-8">
        <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/15 text-lg font-semibold backdrop-blur">
              {user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {greeting()} {user.name.split(" ")[0]}!
              </h1>
              <p className="text-sm text-primary-foreground/80">
                {user.role === "super_admin"
                  ? `Overview across ${db.schools.length} school${db.schools.length === 1 ? "" : "s"}.`
                  : `Welcome back to ${scope.schools[0]?.name ?? "your school"}.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
            >
              <Calendar className="mr-1.5 h-3 w-3" />
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Badge>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/20">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Big stat cards (with mini area charts) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BigStatCard
          label="Tracked Items"
          value={total}
          subtitle="Total tracking entries across the period."
          data={trend}
          dataKey="completed"
          color="var(--primary)"
          breakdown={[
            { label: "Open", value: pending },
            { label: "Running", value: pending },
            { label: "Solved", value: completed },
          ]}
        />
        <BigStatCard
          label="Materials Tracked"
          value={scope.materials.length}
          subtitle="Total materials being tracked across classes."
          data={trend}
          dataKey="total"
          color="var(--success)"
          breakdown={[
            { label: "Open", value: pending },
            { label: "Running", value: pending + overdue },
            { label: "Solved", value: completed },
          ]}
        />
      </div>

      {/* Colored stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Students"
          value={scope.students.length}
          delta="% change"
          trendUp
          icon={Users}
          tone="warning"
        />
        <StatTile
          label="Classes"
          value={scope.classes.length}
          delta="% change"
          trendUp
          icon={GraduationCap}
          tone="success"
        />
        <StatTile
          label="Pending"
          value={pending + overdue}
          delta="% change"
          trendUp={false}
          icon={Clock}
          tone="destructive"
        />
        <StatTile
          label="Completed"
          value={completed}
          delta="% change"
          trendUp={false}
          icon={CheckCircle2}
          tone="primary"
        />
      </div>

      {isEmpty ? (
        <Card className="border-dashed shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Get started with Acadex</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add classes, students, and materials to see your dashboard light up.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/app/classes">Add classes</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/students">Add students</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/materials">Add materials</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Recent tracking + Latest updates */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Recent Tracking</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link to="/app/tracking">
                    View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {recent.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No activity yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="pb-2 text-left font-medium">Student</th>
                          <th className="pb-2 text-left font-medium">Material</th>
                          <th className="pb-2 text-left font-medium">Date</th>
                          <th className="pb-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recent.map((t) => {
                          const stu = db.students.find((s) => s.id === t.studentId);
                          const mat = db.materials.find((m) => m.id === t.materialId);
                          return (
                            <tr key={t.id}>
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {(stu?.name ?? "?")
                                      .split(" ")
                                      .map((s) => s[0])
                                      .slice(0, 2)
                                      .join("")}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-foreground">
                                      {stu?.name ?? "Unknown"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-foreground">{mat?.name ?? "—"}</td>
                              <td className="py-3 text-muted-foreground">
                                {t.promisedDate
                                  ? new Date(t.promisedDate).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </td>
                              <td className="py-3">
                                <StatusBadge status={t.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Latest Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-5">
                  <UpdateItem
                    when="2 hrs ago"
                    icon={<Users className="h-4 w-4" />}
                    bg="bg-primary"
                    title={`+ ${scope.students.length} students tracked`}
                    desc="Roster is up to date — keep it going!"
                  />
                  <UpdateItem
                    when="4 hrs ago"
                    icon={<Package className="h-4 w-4" />}
                    bg="bg-warning"
                    title={`+ ${scope.materials.length} materials added`}
                    desc="Materials list refreshed across classes."
                  />
                  <UpdateItem
                    when="1 day ago"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    bg="bg-success"
                    title={`${completed} items completed`}
                    desc="Great progress this week, keep it up!"
                  />
                  <UpdateItem
                    when="2 days ago"
                    icon={<AlertTriangle className="h-4 w-4" />}
                    bg="bg-destructive"
                    title={`${overdue} items overdue`}
                    desc="Attention needed on a few entries."
                  />
                </ul>
                <div className="mt-4 text-right">
                  <Link
                    to="/app/tracking"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View all updates
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mini stat row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <MiniStat
              label="Visits"
              value={total}
              data={visitsSpark}
              color="var(--primary)"
              up
            />
            <MiniStat
              label="Completion Rate"
              value={`${completionRate}%`}
              data={productsSpark}
              color="var(--success)"
              up
            />
            <MiniStat
              label="Pending"
              value={pending}
              data={bounceSpark}
              color="var(--warning)"
              up={false}
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">Activity (last 7 days)</CardTitle>
                  <CardDescription>Tracking updates per day</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-success/30 bg-success/10 text-success"
                >
                  {completionRate}% complete
                </Badge>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gPend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stroke="var(--success)"
                        strokeWidth={2}
                        fill="url(#gComp)"
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        stroke="var(--warning)"
                        strokeWidth={2}
                        fill="url(#gPend)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status breakdown</CardTitle>
                <CardDescription>All tracked materials</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No tracking data yet.
                  </div>
                ) : (
                  <>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="var(--background)"
                            strokeWidth={2}
                          >
                            {statusData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "var(--popover)",
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              fontSize: 12,
                              color: "var(--popover-foreground)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-2">
                      {statusData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-foreground">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: d.color }}
                            />
                            {d.name}
                          </span>
                          <span className="font-medium text-foreground">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-class + Top performers + Risk gauge */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Per class</CardTitle>
                <CardDescription>Tracking status across top classes</CardDescription>
              </CardHeader>
              <CardContent>
                {classBreakdown.length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                    No classes yet.
                  </div>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={classBreakdown}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                        barCategoryGap={20}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="var(--muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            fontSize: 12,
                            color: "var(--popover-foreground)",
                          }}
                        />
                        <Bar dataKey="completed" stackId="a" fill="var(--success)" />
                        <Bar dataKey="pending" stackId="a" fill="var(--warning)" />
                        <Bar
                          dataKey="overdue"
                          stackId="a"
                          fill="var(--destructive)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-center">Project Risk</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="75%"
                      outerRadius="100%"
                      data={[{ name: "risk", value: riskScore, fill: riskColor }]}
                      startAngle={220}
                      endAngle={-40}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, 20]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar
                        background={{ fill: "var(--muted)" }}
                        dataKey="value"
                        cornerRadius={20}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-4xl font-bold ${riskTone}`}>{riskScore}</div>
                  </div>
                </div>
                <div className={`text-sm font-semibold ${riskTone}`}>{riskLabel}</div>
                <Link
                  to="/app/tracking"
                  className="mt-1 text-xs text-muted-foreground hover:text-primary"
                >
                  Manage tracking →
                </Link>
                <div className="mt-5 grid w-full grid-cols-2 gap-3 border-t border-border pt-4 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Top class</div>
                    <div className="truncate text-sm font-semibold text-foreground">
                      {topClass?.name ?? "—"}
                    </div>
                    <div className="text-xs text-success">{topClass?.rate ?? 0}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Top trade</div>
                    <div className="truncate text-sm font-semibold text-foreground">
                      {topTrade?.name ?? "—"}
                    </div>
                    <div className="text-xs text-primary">{topTrade?.rate ?? 0}%</div>
                  </div>
                </div>
                <Button asChild className="mt-5 w-full">
                  <Link to="/app/reports">
                    <FileBarChart className="mr-2 h-4 w-4" /> Download Report
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 18) return "Good Afternoon,";
  return "Good Evening,";
}

function BigStatCard({
  label,
  value,
  subtitle,
  data,
  dataKey,
  color,
  breakdown,
}: {
  label: string;
  value: number | string;
  subtitle: string;
  data: any[];
  dataKey: string;
  color: string;
  breakdown: { label: string; value: number }[];
}) {
  const id = `bg-${label.replace(/\s+/g, "")}`;
  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="text-3xl font-bold" style={{ color }}>
            {value}+
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{label}</div>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#${id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div
          className="grid grid-cols-3 divide-x divide-primary-foreground/20 text-primary-foreground"
          style={{ background: color }}
        >
          {breakdown.map((b) => (
            <div key={b.label} className="px-3 py-3 text-center">
              <div className="text-2xl font-bold">{b.value}</div>
              <div className="text-xs opacity-90">{b.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  delta,
  trendUp,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  delta: string;
  trendUp: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: { text: "text-primary", bg: "bg-primary/10", chip: "bg-primary/15 text-primary" },
    success: { text: "text-success", bg: "bg-success/10", chip: "bg-success/15 text-success" },
    warning: { text: "text-warning", bg: "bg-warning/10", chip: "bg-warning/15 text-warning" },
    destructive: {
      text: "text-destructive",
      bg: "bg-destructive/10",
      chip: "bg-destructive/15 text-destructive",
    },
  } as const;
  const t = toneMap[tone];
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`text-3xl font-bold ${t.text}`}>{value}</div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.bg}`}>
            <Icon className={`h-5 w-5 ${t.text}`} />
          </div>
        </div>
        <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
        <div
          className={`mt-3 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium ${t.chip}`}
        >
          <span>{delta}</span>
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  data,
  color,
  up,
}: {
  label: string;
  value: number | string;
  data: { v: number }[];
  color: string;
  up: boolean;
}) {
  const id = `ms-${label.replace(/\s+/g, "")}`;
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {label}
            {up ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
          </div>
        </div>
        <div className="h-[50px] w-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function UpdateItem({
  when,
  icon,
  bg,
  title,
  desc,
}: {
  when: string;
  icon: React.ReactNode;
  bg: string;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground ${bg}`}
        >
          {icon}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-1">
        <div className="text-xs text-muted-foreground">{when}</div>
        <div className="mt-0.5 text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </li>
  );
}

export function StatusBadge({ status }: { status: "completed" | "pending" | "overdue" }) {
  const map = {
    completed: {
      label: "Completed",
      cls: "bg-success/15 text-success border-success/30",
      icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
    },
    pending: {
      label: "Pending",
      cls: "bg-warning/15 text-warning border-warning/30",
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
    overdue: {
      label: "Overdue",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      icon: <AlertTriangle className="mr-1 h-3 w-3" />,
    },
  } as const;
  const { label, cls, icon } = map[status];
  return (
    <Badge variant="outline" className={`${cls} flex items-center w-fit`}>
      {icon}
      {label}
    </Badge>
  );
}
