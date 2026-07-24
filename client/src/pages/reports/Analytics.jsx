import { useState } from 'react';
import {
  Zap, MapPin, Users, Package, BarChart2,
  TrendingUp, TrendingDown, Award, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  useGetStockMatrixQuery, useGetFastMoversQuery,
  useGetBestRoutesQuery, useGetCustomerRankingQuery, useGetSalesRepKpiQuery,
} from '../../api/reportsApi';
import { fmtCurrency, fmtDate } from '../../utils/format';
import SkeletonTable from '../../components/ui/SkeletonTable';

// ── helpers ──────────────────────────────────────────────────────
const PERIODS = [
  { label: '7 days',  days: 7  },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
];

const BAR_COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#9333ea','#16a34a'];

function PeriodPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {PERIODS.map(p => (
        <button key={p.days} onClick={() => onChange(p.days)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            value === p.days
              ? 'bg-primary-600 text-white border-transparent'
              : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300'
          }`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function Rank({ n }) {
  const colors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
  const medals = ['🥇','🥈','🥉'];
  if (n <= 3) return <span className="text-base">{medals[n-1]}</span>;
  return <span className="text-xs font-bold text-gray-400 w-5 text-center">{n}</span>;
}

function Pill({ value, max, color = 'bg-primary-500' }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-14 text-right font-mono">{fmtCurrency(value)}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── TAB 1: Stock × Price Matrix ──────────────────────────────────
function StockMatrix() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useGetStockMatrixQuery();
  const { warehouses = [], products = [] } = data || {};

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = (p) => warehouses.reduce((s, w) => s + (p.stock[w.id] || 0), 0);
  const stockStatus = (qty, reorder) => {
    if (qty === 0) return 'bg-red-100 text-red-700';
    if (qty <= reorder) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div>
      <SectionHeader
        title="Price & Stock Matrix"
        subtitle="Current stock levels per warehouse + selling / cost prices"
        action={
          <div className="flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search product..." className="input input-sm w-44 text-xs" />
            <button onClick={refetch} className="btn-secondary p-1.5 rounded-lg"><RefreshCw size={13} /></button>
          </div>
        }
      />

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> Out of stock</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" /> Below reorder</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> OK</span>
      </div>

      {isLoading ? <SkeletonTable rows={8} cols={4 + warehouses.length} /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[180px]">Product</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-[90px]">Sell Price</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-[90px]">Cost Price</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-[60px]">Margin%</th>
                {warehouses.map(w => (
                  <th key={w.id} className="px-3 py-2.5 text-center font-semibold text-gray-600 min-w-[90px]">{w.name}</th>
                ))}
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600 min-w-[70px]">Total</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600 min-w-[70px]">Reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7 + warehouses.length} className="py-8 text-center text-gray-400">No products found</td></tr>
              )}
              {filtered.map(p => {
                const sell = Number(p.selling_price || 0);
                const cost = Number(p.cost_price || 0);
                const margin = sell > 0 ? ((sell - cost) / sell * 100).toFixed(1) : '—';
                const total = totalStock(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 sticky left-0 bg-white hover:bg-gray-50 z-10">
                      <p className="font-semibold text-gray-800 truncate max-w-[160px]">{p.name}</p>
                      <p className="text-gray-400 font-mono">{p.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtCurrency(sell)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-500">{fmtCurrency(cost)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-semibold ${Number(margin) >= 20 ? 'text-green-600' : Number(margin) >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                        {margin}{margin !== '—' ? '%' : ''}
                      </span>
                    </td>
                    {warehouses.map(w => {
                      const qty = p.stock[w.id] || 0;
                      return (
                        <td key={w.id} className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold tabular-nums ${stockStatus(qty, p.reorder_point)}`}>
                            {qty}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-bold text-gray-800">{total}</td>
                    <td className="px-3 py-2.5 text-center text-gray-400">{p.reorder_point || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">{filtered.length} products · {warehouses.length} warehouses</p>
    </div>
  );
}

// ── TAB 2: Fast Movers ───────────────────────────────────────────
function FastMovers() {
  const [days, setDays] = useState(30);
  const { data = [], isLoading } = useGetFastMoversQuery({ days, limit: 20 });
  const maxUnits = Math.max(...data.map(r => Number(r.units_sold || 0)), 1);

  return (
    <div>
      <SectionHeader
        title="Fast Moving Items"
        subtitle="Products ranked by units sold in the selected period"
        action={<PeriodPicker value={days} onChange={setDays} />}
      />
      {isLoading ? <SkeletonTable rows={10} cols={5} /> : data.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No sales data in this period.</div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="mb-6 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0,10).map(r => ({ name: r.name?.length > 15 ? r.name.slice(0,14)+'…' : r.name, units: Number(r.units_sold) }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [v, 'Units Sold']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }} />
                <Bar dataKey="units" radius={[4,4,0,0]} maxBarSize={36}>
                  {data.slice(0,10).map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Product</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Units Sold</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Revenue</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">GP%</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Invoices</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Customers</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-40">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5"><Rank n={i+1} /></td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-900 tabular-nums">{Number(r.units_sold || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums font-mono">{fmtCurrency(r.revenue)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-semibold ${Number(r.gp_pct) >= 20 ? 'text-green-600' : Number(r.gp_pct) >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                        {r.gp_pct != null ? `${r.gp_pct}%` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{r.invoice_count}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{r.customers}</td>
                    <td className="px-3 py-2.5">
                      <Pill value={Number(r.units_sold)} max={maxUnits} color="bg-primary-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── TAB 3: Best Routes ───────────────────────────────────────────
function BestRoutes() {
  const [days, setDays] = useState(30);
  const { data = [], isLoading } = useGetBestRoutesQuery({ days });
  const maxSales = Math.max(...data.map(r => Number(r.total_sales || 0)), 1);

  return (
    <div>
      <SectionHeader
        title="Route Performance"
        subtitle="Sales, collections and customer coverage per route"
        action={<PeriodPicker value={days} onChange={setDays} />}
      />
      {isLoading ? <SkeletonTable rows={6} cols={6} /> : data.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No route data.</div>
      ) : (
        <>
          <div className="mb-6 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map(r => ({ name: r.route_name, sales: Number(r.total_sales), collected: Number(r.collected) }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, n) => [fmtCurrency(v), n === 'sales' ? 'Sales' : 'Collected']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }} />
                <Bar dataKey="sales"     fill="#2563eb" radius={[4,4,0,0]} maxBarSize={28} name="sales" />
                <Bar dataKey="collected" fill="#10b981" radius={[4,4,0,0]} maxBarSize={28} name="collected" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Route</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Sales Rep</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Invoices</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Customers</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Units Sold</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Total Sales</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Collected</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Outstanding</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-36">Sales Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5"><Rank n={i+1} /></td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{r.route_name}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{r.sales_rep}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{r.invoice_count}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{r.customers_served}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{Number(r.units_sold).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800 font-mono">{fmtCurrency(r.total_sales)}</td>
                    <td className="px-3 py-2.5 text-right text-green-600 font-mono">{fmtCurrency(r.collected)}</td>
                    <td className="px-3 py-2.5 text-right text-red-500 font-mono">{fmtCurrency(r.outstanding)}</td>
                    <td className="px-3 py-2.5">
                      <Pill value={Number(r.total_sales)} max={maxSales} color="bg-blue-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── TAB 4: Best Sales Reps ───────────────────────────────────────
function BestSalesReps() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data = [], isLoading } = useGetSalesRepKpiQuery({ year, month });
  const active = data.filter(r => Number(r.invoice_count) > 0);
  const maxSales = Math.max(...active.map(r => Number(r.total_sales || 0)), 1);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div>
      <SectionHeader
        title="Sales Rep Performance"
        subtitle="Individual rep KPIs — invoices, revenue, collections and customers served"
        action={
          <div className="flex items-center gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input input-sm text-xs">
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="input input-sm text-xs">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />
      {isLoading ? <SkeletonTable rows={5} cols={5} /> : data.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No sales rep data.</div>
      ) : (
        <>
          {/* Cards for active reps */}
          {active.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {active.slice(0,3).map((r, i) => (
                <div key={r.id} className="card p-4 border-t-4 border-primary-500">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">#{i+1}</p>
                      <p className="font-bold text-gray-900 text-sm">{r.rep_name}</p>
                    </div>
                    <Award size={20} className={i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-600'} />
                  </div>
                  <p className="text-lg font-bold text-primary-600 font-mono">{fmtCurrency(r.total_sales)}</p>
                  <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-gray-500">
                    <div><p className="font-semibold text-gray-700">{r.invoice_count}</p><p>Invoices</p></div>
                    <div><p className="font-semibold text-gray-700">{r.customers_served}</p><p>Customers</p></div>
                    <div><p className="font-semibold text-green-600">{fmtCurrency(r.collected)}</p><p>Collected</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Rep</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Invoices</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Customers</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Total Sales</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Collected</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-36">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${Number(r.invoice_count) === 0 ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2.5"><Rank n={i+1} /></td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-gray-800">{r.rep_name}</p>
                      <p className="text-xs text-gray-400">{r.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{r.invoice_count}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{r.customers_served}</td>
                    <td className="px-3 py-2.5 text-right font-semibold font-mono text-gray-800">{fmtCurrency(r.total_sales)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-green-600">{fmtCurrency(r.collected)}</td>
                    <td className="px-3 py-2.5">
                      <Pill value={Number(r.total_sales)} max={maxSales} color="bg-purple-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── TAB 5: Customer Ranking ──────────────────────────────────────
function CustomerRanking() {
  const [days, setDays] = useState(90);
  const { data = [], isLoading } = useGetCustomerRankingQuery({ days });
  const active = data.filter(r => Number(r.total_sales) > 0);
  const inactive = data.filter(r => Number(r.total_sales) === 0);
  const maxSales = Math.max(...active.map(r => Number(r.total_sales)), 1);

  return (
    <div>
      <SectionHeader
        title="Customer Ranking"
        subtitle="Top customers by revenue — spot VIP buyers and inactive accounts"
        action={<PeriodPicker value={days} onChange={setDays} />}
      />

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{active.length}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><TrendingUp size={11} className="text-green-500" /> Active buyers</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{inactive.length}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><TrendingDown size={11} className="text-red-500" /> No purchases</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{fmtCurrency(active.reduce((s,r) => s + Number(r.total_sales), 0))}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total revenue</p>
        </div>
      </div>

      {isLoading ? <SkeletonTable rows={10} cols={6} /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Route</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Invoices</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Total Sales</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Collected</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Outstanding</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Last Invoice</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-36">Revenue Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r, i) => {
                const noSales = Number(r.total_sales) === 0;
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${noSales ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2.5">{noSales ? <AlertTriangle size={13} className="text-gray-300" /> : <Rank n={i+1} />}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.code} · <span className="text-gray-300">{r.customer_type}</span></p>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{r.route || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{r.invoice_count}</td>
                    <td className="px-3 py-2.5 text-right font-semibold font-mono text-gray-800">{fmtCurrency(r.total_sales)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-green-600">{fmtCurrency(r.collected)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-500">{fmtCurrency(r.outstanding)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{fmtDate(r.last_invoice_date)}</td>
                    <td className="px-3 py-2.5">
                      <Pill value={Number(r.total_sales)} max={maxSales} color="bg-teal-500" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
const TABS = [
  { id: 'matrix',    label: 'Price & Stock Matrix', icon: Package    },
  { id: 'movers',   label: 'Fast Movers',           icon: Zap        },
  { id: 'routes',   label: 'Best Routes',           icon: MapPin     },
  { id: 'reps',     label: 'Best Sales Reps',       icon: Award      },
  { id: 'customers',label: 'Customer Ranking',      icon: Users      },
];

export default function Analytics() {
  const [tab, setTab] = useState('matrix');

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 size={20} className="text-primary-600" /> Analytics & Insights
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Price matrix, inventory visibility and performance rankings</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-0">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                active
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="card p-6">
        {tab === 'matrix'    && <StockMatrix />}
        {tab === 'movers'    && <FastMovers />}
        {tab === 'routes'    && <BestRoutes />}
        {tab === 'reps'      && <BestSalesReps />}
        {tab === 'customers' && <CustomerRanking />}
      </div>
    </div>
  );
}
