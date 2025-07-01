import React from 'react';
import { cn } from '@/lib/utils';

interface BetaBadgeProps {
  className?: string;
  showText?: boolean;
}

const BetaBadge: React.FC<BetaBadgeProps> = ({ className, showText = true }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'backdrop-blur-md bg-orange-500/20 border border-orange-300/50',
        'rounded-full shadow-lg transition-all duration-300',
        'hover:bg-orange-500/30 hover:border-orange-400/60',
        showText ? 'px-3 py-1' : 'w-6 h-6',
        className
      )}
    >
      <span className={cn('font-bold text-orange-700', showText ? 'text-xs' : 'text-[10px]')}>
        {showText ? 'BETA' : 'β'}
      </span>
    </div>
  );
};

export default BetaBadge;
