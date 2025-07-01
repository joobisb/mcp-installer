import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const MoreClientsIndicator = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center space-x-1 cursor-pointer">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-600/50"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-600/30"></div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>VS Code, Windsurf & more coming soon</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default MoreClientsIndicator;
