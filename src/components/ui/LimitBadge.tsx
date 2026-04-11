import React from 'react';

interface LimitBadgeProps {
  current: number;
  limit: number;
  label: string;
}

export const LimitBadge: React.FC<LimitBadgeProps> = ({ current, limit, label }) => {
  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 90;

  return (
    <div className="w-full space-y-2 mb-6">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        <span className={`text-sm font-bold ${isNearLimit ? 'text-red-500' : 'text-white'}`}>
          {current} <span className="text-gray-600 font-normal">/ {limit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 rounded-full ${
            isNearLimit ? 'bg-red-500' : 'bg-[#25D366]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
