import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'bg-blue-100' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', ring: 'bg-green-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'bg-amber-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'bg-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'bg-purple-100' },
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', trend, trendLabel, loading }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="card-body">
          <div className="skeleton h-3 w-24 mb-3" />
          <div className="skeleton h-7 w-32 mb-2" />
          <div className="skeleton h-3 w-20" />
        </div>
      </div>
    );
  }

  const trendUp = trend > 0;
  const trendDown = trend < 0;
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;
  const trendColor = trendUp ? 'text-green-600' : trendDown ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="card animate-fade-in">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
                <TrendIcon size={13} />
                <span>
                  {trend > 0 ? '+' : ''}{trend}% {trendLabel || 'vs last period'}
                </span>
              </div>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl ${c.ring} flex items-center justify-center flex-shrink-0`}>
            <Icon size={22} className={c.icon} />
          </div>
        </div>
      </div>
    </div>
  );
}
