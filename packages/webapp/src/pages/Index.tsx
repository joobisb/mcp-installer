import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Copy,
  ExternalLink,
  Shield,
  Package,
  Database,
  Code,
  Wrench,
  AlertCircle,
  Check,
  Github,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import ClientIcons from '@/components/ClientIcons';
import MoreClientsIndicator from '@/components/MoreClientsIndicator';
import BetaBadge from '@/components/ui/beta-badge';
import ServerRequestFAB from '@/components/ServerRequestFAB';
import { getServersData, type RegistryData, type MCPServer } from '@/lib/registry';

const categoryIcons = {
  development: Code,
  productivity: Package,
  database: Database,
  web: Search,
  ai: Package,
  utility: Wrench,
};

const difficultyColors = {
  simple: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  advanced: 'bg-red-100 text-red-800 border-red-200',
};

// Verified Badge Component
const VerifiedBadge = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center justify-center w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-sm cursor-help">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm font-medium">Verified</p>
      </TooltipContent>
    </Tooltip>
  );
};

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [serversData, setServersData] = useState<RegistryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load registry data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getServersData();
        setServersData(data);
      } catch (err) {
        console.error('Failed to load registry data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load server registry');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const categories = useMemo(() => {
    if (!serversData?.servers) return ['all'];
    const cats = ['all', ...new Set(serversData.servers.map((server) => server.category))];
    return cats;
  }, [serversData]);

  const filteredServers = useMemo(() => {
    if (!serversData?.servers) return [];

    const filtered = serversData.servers.filter((server) => {
      const matchesSearch =
        server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (server.tags &&
          server.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    console.log('Debug - serversData:', serversData);
    console.log('Debug - searchQuery:', searchQuery);
    console.log('Debug - selectedCategory:', selectedCategory);
    console.log('Debug - filtered servers:', filtered);

    return filtered;
  }, [searchQuery, selectedCategory, serversData]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Command copied to clipboard',
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the command manually',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const getInstallCommand = (server) => {
    return `mcp-installer install ${server.id}`;
  };

  const getClientSpecificCommand = (server, client) => {
    const baseCommand = getInstallCommand(server);
    const clientCommands = {
      claude: `mcp-installer install ${server.id} --clients=claude-desktop`,
      'claude-code': `mcp-installer install ${server.id} --clients=claude`,
      cursor: `mcp-installer install ${server.id} --clients=cursor`,
      continue: `mcp-installer install ${server.id} --clients=gemini`,
      gemini: `mcp-installer install ${server.id} --clients=gemini`,
    };
    return clientCommands[client] || baseCommand;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/40 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/60 rounded-2xl p-8 border border-orange-200/50 shadow-xl">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
            <p className="text-amber-700 font-medium">Loading MCP servers...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/40 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/60 rounded-2xl p-8 border border-red-200/50 shadow-xl max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h3 className="text-red-700 font-semibold text-lg">Failed to Load Registry</h3>
            <p className="text-red-600 text-center">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-red-200 text-red-600 hover:text-red-800 hover:border-red-300"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/40">
      {/* Header */}
      <header className="relative overflow-hidden">
        {/* Ambient background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-orange-50/10 to-red-50/20"></div>

        {/* Glass morphism header */}
        <div className="relative backdrop-blur-sm bg-white/60 border-b border-orange-100/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Top section with MCP Installer in top left and GitHub link in top right */}
            <div className="flex justify-between items-center mb-8">
              <div className="relative flex items-center space-x-3">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-red-600 bg-clip-text text-transparent">
                  MCP Installer
                </h1>
                <BetaBadge showText={true} className="hidden sm:inline-flex" />
                <BetaBadge showText={false} className="sm:hidden" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-3">
                  <p className="text-base font-medium text-amber-800">Supported Clients:</p>
                  <ClientIcons />
                  <MoreClientsIndicator />
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open('https://coff.ee/joobisb', '_blank')}
                    className="backdrop-blur-sm bg-white/40 border border-orange-200/50 text-amber-700 hover:bg-white/60 hover:border-orange-300/50 shadow-md transition-all duration-300"
                  >
                    <img
                      src="/icons/clients/buymeacoffee.png"
                      alt="Buy Me A Coffee"
                      className="h-5 w-5 mr-2"
                    />
                    <span className="hidden sm:inline">Support</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open('https://github.com/joobisb/mcp-installer', '_blank')
                    }
                    className="backdrop-blur-sm bg-white/40 border border-orange-200/50 text-amber-700 hover:bg-white/60 hover:border-orange-300/50 shadow-md transition-all duration-300"
                  >
                    <Github className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Open Source</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Centered subtitle section */}
            <div className="text-center mb-8">
              <div className="max-w-3xl mx-auto">
                {/* Subtitle with glass effect */}
                <div className="backdrop-blur-sm bg-white/40 px-6 py-5 rounded-2xl border border-orange-200/50 shadow-lg">
                  <p className="text-lg md:text-xl text-amber-800 font-medium leading-relaxed mb-2">
                    Search your server and copy install commands with one-click simplicity!
                  </p>
                  <p className="text-base md:text-lg text-amber-700 font-normal">
                    Effortless server setup for all your AI clients
                  </p>
                </div>
              </div>
            </div>

            {/* Prerequisite Banner with reduced height */}
            <div className="backdrop-blur-md bg-amber-50/60 border border-amber-200/50 rounded-2xl p-4 mb-6 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-amber-500/10 rounded-xl backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-900 mb-1">
                    Prerequisite Required
                  </h3>
                  <p className="text-amber-700 mb-2 text-sm">
                    Install the MCP installer CLI tool first:
                  </p>
                  <div className="backdrop-blur-sm bg-white/70 rounded-xl border border-white/50 px-4 py-2 font-mono text-sm text-amber-900 flex items-center justify-between shadow-inner">
                    <span>npm install -g @mcp-installer/cli</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('npm install -g @mcp-installer/cli')}
                      className="h-8 px-3 text-amber-600 hover:text-amber-800 hover:bg-amber-100/50 backdrop-blur-sm"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar with enhanced glass effect */}
            <div className="relative max-w-2xl mx-auto">
              <div className="relative backdrop-blur-xl bg-white/60 rounded-2xl border border-orange-200/50 shadow-xl p-2">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-amber-600 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search MCP servers by name, description, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-14 pr-6 py-4 text-lg bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-amber-500 text-amber-800 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filters */}
      <div className="bg-white/30 border-y border-orange-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="flex justify-center"
          >
            <div className="p-1.5 bg-white/60 backdrop-blur-md rounded-full border border-orange-200/50 shadow-lg">
              <TabsList className="bg-transparent p-0">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="px-4 py-2 text-sm font-semibold text-amber-700 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-amber-900 rounded-full transition-all duration-300"
                  >
                    {category === 'ai' || category === 'crm'
                      ? category.toUpperCase()
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Server Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServers.map((server) => {
            const CategoryIcon = categoryIcons[server.category] || Package;

            return (
              <Card
                key={server.id}
                className="flex flex-col transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl hover:border-orange-300/80 bg-white/60 backdrop-blur-md border border-orange-200/50 shadow-lg rounded-2xl overflow-hidden"
                onClick={() => setSelectedServer(server)}
              >
                <CardHeader className="flex-shrink-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                          <CategoryIcon className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-amber-900 transition-colors">
                              {server.name}
                            </CardTitle>
                            <VerifiedBadge />
                          </div>
                          <p className="text-sm text-gray-500">by {server.author}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow flex flex-col">
                  <CardDescription className="text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {server.description}
                  </CardDescription>
                </CardContent>

                {/* Footer */}
                <div className="mt-auto p-4 border-t border-orange-200/50 bg-amber-50/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-700 hover:bg-amber-100/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(getInstallCommand(server));
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Install
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      {server.documentation && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-700 hover:bg-amber-100/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(server.documentation, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Documentation</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {server.repository && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-700 hover:bg-amber-100/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(server.repository, '_blank');
                              }}
                            >
                              <Github className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Repository</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredServers.length === 0 && serversData && (
          <div className="text-center py-12">
            <div className="backdrop-blur-md bg-white/60 rounded-2xl p-8 border border-orange-200/50 shadow-xl inline-block max-w-md">
              <Package className="h-16 w-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-amber-700 mb-2">No servers found</h3>
              <p className="text-amber-600 mb-4">
                Try adjusting your search query or category filter.
              </p>

              {searchQuery && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700 mb-3">
                    Can't find "<span className="font-medium">{searchQuery}</span>"?
                  </p>
                  <Button
                    onClick={() => {
                      // Find and trigger the FAB modal
                      const event = new CustomEvent('openServerRequest', {
                        detail: { serverName: searchQuery },
                      });
                      window.dispatchEvent(event);
                    }}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request This Server
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Debug: filteredServers.length = {filteredServers.length}, serversData.servers.length
                = {serversData?.servers?.length || 0}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Installation Modal */}
      <Dialog open={!!selectedServer} onOpenChange={() => setSelectedServer(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedServer && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    {React.createElement(categoryIcons[selectedServer.category] || Package, {
                      className: 'h-6 w-6 text-amber-600',
                    })}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <DialogTitle className="text-2xl font-bold text-gray-900">
                        {selectedServer.name}
                      </DialogTitle>
                      <VerifiedBadge />
                    </div>
                    <p className="text-gray-500">by {selectedServer.author}</p>
                  </div>
                </div>
                <DialogDescription className="text-gray-600 text-base">
                  {selectedServer.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Server Details */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${difficultyColors[selectedServer.difficulty]} border`}>
                    {selectedServer.difficulty}
                  </Badge>
                  {selectedServer.requiresAuth && (
                    <Badge
                      variant="outline"
                      className="border-amber-200 text-amber-700 bg-amber-50"
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Authentication Required
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedServer.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Parameters Section */}
                {selectedServer.parameters && Object.keys(selectedServer.parameters).length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Configuration Required</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            This server requires configuration
                          </p>
                          <p className="text-sm text-blue-700">
                            The following parameters need to be provided during installation:
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(selectedServer.parameters).map(([key, param]) => (
                          <div key={key} className="bg-white rounded border border-blue-100 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                {key}
                              </span>
                              <div className="flex items-center space-x-2">
                                {param.required && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-red-200 text-red-700 bg-red-50"
                                  >
                                    Required
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-200 text-gray-600 bg-gray-50"
                                >
                                  {param.type.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{param.description}</p>
                            {param.placeholder && (
                              <div className="bg-gray-50 rounded px-2 py-1">
                                <span className="text-xs text-gray-500">Example: </span>
                                <code className="text-xs font-mono text-gray-700">
                                  {param.placeholder}
                                </code>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Installation Commands */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Installation Commands</h4>

                  <Tabs defaultValue="universal" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="universal">All Clients</TabsTrigger>
                      <TabsTrigger value="claude">Claude</TabsTrigger>
                      <TabsTrigger value="cursor">Cursor</TabsTrigger>
                      <TabsTrigger value="gemini">Gemini CLI</TabsTrigger>
                    </TabsList>

                    <TabsContent value="universal" className="mt-4">
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">
                            Install to All Detected Clients
                          </h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getInstallCommand(selectedServer))}
                            className="text-amber-600 hover:text-amber-800"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <code className="block text-sm font-mono text-gray-800 bg-white p-3 rounded border">
                          {getInstallCommand(selectedServer)}
                        </code>
                        <p className="text-xs text-gray-500 mt-2">
                          This will install the server to all detected AI clients (Claude Desktop,
                          Claude Code, Cursor, Gemini CLI)
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="claude" className="mt-4">
                      <div className="space-y-4">
                        {/* Claude Desktop */}
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">Install to Claude Desktop</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(getClientSpecificCommand(selectedServer, 'claude'))
                              }
                              className="text-amber-600 hover:text-amber-800"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <code className="block text-sm font-mono text-gray-800 bg-white p-3 rounded border">
                            {getClientSpecificCommand(selectedServer, 'claude')}
                          </code>
                          <p className="text-xs text-gray-500 mt-2">
                            This will install the server to Claude Desktop app
                          </p>
                        </div>

                        {/* Claude Code */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">Install to Claude Code</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  getClientSpecificCommand(selectedServer, 'claude-code')
                                )
                              }
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <code className="block text-sm font-mono text-gray-800 bg-white p-3 rounded border">
                            {getClientSpecificCommand(selectedServer, 'claude-code')}
                          </code>
                          <p className="text-xs text-gray-500 mt-2">
                            This will install the server to claude cli
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="cursor" className="mt-4">
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">Install to Cursor Only</h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(getClientSpecificCommand(selectedServer, 'cursor'))
                            }
                            className="text-amber-600 hover:text-amber-800"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <code className="block text-sm font-mono text-gray-800 bg-white p-3 rounded border">
                          {getClientSpecificCommand(selectedServer, 'cursor')}
                        </code>
                        <p className="text-xs text-gray-500 mt-2">
                          This will install the server only to Cursor
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="gemini" className="mt-4">
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">Install to Gemini CLI Only</h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(getClientSpecificCommand(selectedServer, 'gemini'))
                            }
                            className="text-amber-600 hover:text-amber-800"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <code className="block text-sm font-mono text-gray-800 bg-white p-3 rounded border">
                          {getClientSpecificCommand(selectedServer, 'gemini')}
                        </code>
                        <p className="text-xs text-gray-500 mt-2">
                          This will install the server only to Gemini CLI
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Documentation Links */}
                <div className="flex space-x-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedServer.documentation, '_blank')}
                    className="flex items-center text-amber-600 hover:text-amber-800 border-amber-200 hover:border-amber-300"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedServer.repository, '_blank')}
                    className="flex items-center text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Repository
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Server Requests */}
      <ServerRequestFAB />
    </div>
  );
};

export default Index;
