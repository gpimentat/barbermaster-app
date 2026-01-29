import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
  color?: string;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  positive,
  icon: Icon,
  color = "text-primary-500",
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-dark-900 p-6 rounded-xl border border-gray-800 shadow-lg transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-gray-700 hover:bg-gray-800/50 active:scale-[0.98]' : ''
        }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg bg-gray-800 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        {change && (
          <span className={`text-sm font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatsCard;