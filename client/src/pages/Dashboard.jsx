import { TrendingUp, Users, AlertTriangle, DollarSign, BarChart2, PieChart as PieIcon } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useGetDashboardQuery, useGetDashboardTrendQuery } from '../api/reportsApi';
import { fmtCurrency, fmtDate } from '../utils/format';
import StatsCard from '../components/ui/StatsCard';
import SkeletonTable from '../components/ui/SkeletonTable';

const LKR_FORMATTER = (v) => `LKR ${(v / 1000).toFixed(0)}k`;

const STATUS_COLORS = {
  DRAFT: '#94a3b8',
  POSTED: '#3b82f6',
  PARTIAL: '#f59e0b',
  PAID: '#10b981',
  OVERDUE: '#ef4444',
};

function ChartSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="card-header">
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="card-body">
        <div className="skeleton h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardQuery(undefined, { pollingInterval: 120000 });
  const { data: trend, isLoading: trendLoading } = useGetDashboardTrendQuery(30);

  const { sales, collections, stock, top_products, status_dist, monthly_trend } = data || {};

  const trendData = (trend || []).map(r => ({
    date: r.date?.slice(5),  // MM-DD
    sales: Number(r.sales) || 0,
    count: Number(r.count) || 0,
  }));

  const barData = (top_products || []).map(p => ({
    name: p.name?.length > 14 ? p.name.slice(0, 13) + '…' : p.name,
    revenue: Number(p.revenue) || 0,
  }));

  const pieData = (status_dist || []).map(r => ({
    name: r.status,
    value: Number(r.count) || 0,
    color: STATUS_COLORS[r.status] || '#94a3b8',
  }));

  const monthlyData = (monthly_trend || []).map(r => ({
    month: r.month?.slice(5),   // strip year, show MM only
    sales: Number(r.sales) || 0,
    collected: Number(r.collected) || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Sales"
          value={fmtCurrency(sales?.today)}
          icon={TrendingUp}
          color="blue"
          loading={isLoading}
        />
        <StatsCard
          title="Month Sales"
          value={fmtCurrency(sales?.this_month)}
          icon={DollarSign}
          color="green"
          loading={isLoading}
        />
        <StatsCard
          title="Outstanding"
          value={fmtCurrency(sales?.total_outstanding)}
          icon={Users}
          color="amber"
          loading={isLoading}
          trendLabel={`${sales?.overdue_count || 0} overdue`}
        />
        <StatsCard
          title="Low Stock Items"
          value={stock?.low_stock_count ?? 0}
          icon={AlertTriangle}
          color="red"
          loading={isLoading}
          trendLabel="below reorder point"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart — 30-day trend */}
        {trendLoading ? (
          <div className="lg:col-span-2"><ChartSkeleton /></div>
        ) : (
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-600" />
                30-Day Sales Trend
              </h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={LKR_FORMATTER} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip
                    formatter={(v) => [fmtCurrency(v), 'Sales']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} fill="url(#salesGrad)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bar chart — top products */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BarChart2 size={16} className="text-primary-600" />
                Top Products
              </h3>
            </div>
            <div className="card-body">
              {barData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart layout="vertical" data={barData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tickFormatter={LKR_FORMATTER} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} />
                    <Tooltip
                      formatter={(v) => [fmtCurrency(v), 'Revenue']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm py-8 text-center">No sales data this month.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Second charts row: 6-month trend + invoice status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grouped bar — 6-month sales vs collections */}
        {isLoading ? (
          <div className="lg:col-span-2"><ChartSkeleton /></div>
        ) : (
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BarChart2 size={16} className="text-primary-600" />
                Sales vs Collections (6 Months)
              </h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={LKR_FORMATTER} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip
                    formatter={(v, name) => [fmtCurrency(v), name === 'sales' ? 'Sales' : 'Collected']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }}
                  />
                  <Legend formatter={v => v === 'sales' ? 'Sales' : 'Collected'} iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Donut — invoice status breakdown */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <PieIcon size={16} className="text-primary-600" />
                Invoice Status
              </h3>
            </div>
            <div className="card-body flex flex-col items-center">
              {pieData.length ? (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [v, name]}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1 w-full">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="truncate">{d.name}</span>
                        <span className="ml-auto font-semibold text-gray-800">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm py-8 text-center">No invoice data.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Performance summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-800">Monthly Performance</h3>
        </div>
        <div className="card-body">
          {isLoading ? (
            <SkeletonTable rows={3} cols={2} />
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Total Sales', value: fmtCurrency(sales?.this_month), pct: 100, color: 'bg-primary-500' },
                {
                  label: 'Collected',
                  value: fmtCurrency(collections?.this_month),
                  pct: sales?.this_month ? (Number(collections?.this_month) / Number(sales.this_month)) * 100 : 0,
                  color: 'bg-emerald-500',
                },
                {
                  label: 'Outstanding',
                  value: fmtCurrency(sales?.total_outstanding),
                  pct: sales?.this_month ? Math.min((Number(sales.total_outstanding) / Number(sales.this_month)) * 100, 100) : 0,
                  color: 'bg-amber-500',
                },
              ].map(({ label, value, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">{label}</span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(1, Math.min(pct, 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
