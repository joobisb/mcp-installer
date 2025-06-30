import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ClientIcons = () => {
  return (
    <div className="flex items-center space-x-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src="/icons/clients/cursor.svg"
            alt="Cursor"
            className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Cursor</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src="/icons/clients/gemini.svg"
            alt="Gemini CLI"
            className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Gemini CLI</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src="/icons/clients/claude.svg"
            alt="Claude Desktop"
            className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Claude Desktop</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ClientIcons;
