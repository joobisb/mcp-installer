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
            alt="Claude Code"
            className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Claude Code</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <img
              src="/icons/clients/vscode.svg"
              alt="VSCode"
              className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Visual Studio Code</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <img
              src="/icons/clients/kiro.png"
              alt="VSCode"
              className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kiro</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ClientIcons;
