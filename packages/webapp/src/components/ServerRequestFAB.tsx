import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ServerRequestModal from './ServerRequestModal';

export default function ServerRequestFAB() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledServerName, setPrefilledServerName] = useState('');

  // Listen for custom events to open modal with prefilled data
  useEffect(() => {
    const handleOpenServerRequest = (event: CustomEvent) => {
      if (event.detail?.serverName) {
        setPrefilledServerName(event.detail.serverName);
      }
      setIsModalOpen(true);
    };

    window.addEventListener('openServerRequest', handleOpenServerRequest as EventListener);

    return () => {
      window.removeEventListener('openServerRequest', handleOpenServerRequest as EventListener);
    };
  }, []);

  const handleOpenModal = () => {
    setPrefilledServerName('');
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleOpenModal}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-2">
            <p className="font-medium">Request New Server</p>
            <p className="text-xs text-gray-500">Can't find what you need?</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Server Request Modal */}
      <ServerRequestModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        prefilledServerName={prefilledServerName}
      />
    </>
  );
}
