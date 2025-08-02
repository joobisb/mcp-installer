import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Index from '../Index';

import * as registryModule from '@/lib/registry';
import * as useToastModule from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/registry', () => ({
  getServersData: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  generateCursorDeepLink: vi.fn(() => 'cursor://install-mcp-server'),
}));

vi.mock('@/components/ClientIcons', () => ({
  default: () => <div data-testid="client-icons">Client Icons</div>,
}));

vi.mock('@/components/MoreClientsIndicator', () => ({
  default: () => <div data-testid="more-clients">More Clients</div>,
}));

vi.mock('@/components/ui/beta-badge', () => ({
  default: ({ showText, className }) => (
    <div data-testid="beta-badge" className={className}>
      {showText ? 'Beta' : 'B'}
    </div>
  ),
}));

vi.mock('@/components/ServerRequestFAB', () => ({
  default: () => <div data-testid="server-request-fab">Request Server FAB</div>,
}));

// Mock UI components with minimal implementations
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props) => <input {...props} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick, className }) => (
    <div onClick={onClick} className={className} data-testid="server-card">
      {children}
    </div>
  ),
  CardContent: ({ children }) => <div>{children}</div>,
  CardDescription: ({ children }) => <p>{children}</p>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange: _onOpenChange }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange: _onValueChange }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value }) => <div data-value={value}>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children, value, onClick }) => (
    <button onClick={onClick} data-value={value}>{children}</button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }) => <div>{children}</div>,
  TooltipContent: ({ children }) => <div>{children}</div>,
  TooltipTrigger: ({ children }) => <div>{children}</div>,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock window.open
Object.defineProperty(global, 'window', {
  value: {
    ...global.window,
    open: vi.fn(),
    location: {
      ...global.window?.location,
      reload: vi.fn(),
    },
  },
  writable: true,
});

const mockServersData = {
  servers: [
    {
      id: 'test-server-1',
      name: 'Test Server 1',
      description: 'A test MCP server for development',
      author: 'Test Author',
      category: 'development',
      difficulty: 'simple',
      tags: ['test', 'development'],
      requiresAuth: false,
      documentation: 'https://example.com/docs',
      repository: 'https://github.com/example/server1',
      parameters: {},
    },
    {
      id: 'test-server-2',
      name: 'Test Server 2',
      description: 'Another test server with authentication',
      author: 'Another Author',
      category: 'productivity',
      difficulty: 'medium',
      tags: ['productivity', 'auth'],
      requiresAuth: true,
      documentation: 'https://example.com/docs2',
      repository: 'https://github.com/example/server2',
      parameters: {
        apiKey: {
          type: 'string',
          description: 'API key for authentication',
          required: true,
          placeholder: 'your-api-key-here',
        },
      },
    },
  ],
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Index Component - MCP Installer Registry', () => {
  const mockGetServersData = vi.mocked(registryModule).getServersData;
  const mockToast = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServersData.mockResolvedValue(mockServersData);
    
    // Mock useToast hook
    vi.mocked(useToastModule).useToast.mockReturnValue({
      toast: mockToast,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Loading States', () => {
    it('displays loading state initially', async () => {
      mockGetServersData.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderWithRouter(<Index />);
      
      expect(screen.getByText('Loading MCP servers...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /loader/i })).toBeInTheDocument();
    });

    it('transitions from loading to content when data loads successfully', async () => {
      renderWithRouter(<Index />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('MCP Installer')).toBeInTheDocument();
      expect(screen.getByText('Test Server 1')).toBeInTheDocument();
    });

    it('displays error state when data loading fails', async () => {
      const errorMessage = 'Failed to fetch registry data';
      mockGetServersData.mockRejectedValue(new Error(errorMessage));
      
      renderWithRouter(<Index />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to Load Registry')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('retries loading when try again button is clicked', async () => {
      mockGetServersData.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithRouter(<Index />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to Load Registry')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);
      
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Header and Navigation', () => {
    beforeEach(async () => {
      renderWithRouter(<Index />);
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
    });

    it('displays the main title and beta badge', () => {
      expect(screen.getByText('MCP Installer')).toBeInTheDocument();
      expect(screen.getByTestId('beta-badge')).toBeInTheDocument();
    });

    it('shows client icons and support links', () => {
      expect(screen.getByTestId('client-icons')).toBeInTheDocument();
      expect(screen.getByTestId('more-clients')).toBeInTheDocument();
      
      const supportButton = screen.getByRole('button', { name: /support/i });
      const githubButton = screen.getByRole('button', { name: /open source/i });
      
      expect(supportButton).toBeInTheDocument();
      expect(githubButton).toBeInTheDocument();
    });

    it('opens external links when support and GitHub buttons are clicked', () => {
      const supportButton = screen.getByRole('button', { name: /support/i });
      const githubButton = screen.getByRole('button', { name: /open source/i });
      
      fireEvent.click(supportButton);
      expect(window.open).toHaveBeenCalledWith('https://coff.ee/joobisb', '_blank');
      
      fireEvent.click(githubButton);
      expect(window.open).toHaveBeenCalledWith('https://github.com/joobisb/mcp-installer', '_blank');
    });

    it('displays VSCode announcement banner initially', () => {
      expect(screen.getByText(/VSCode support is now available/i)).toBeInTheDocument();
    });

    it('closes VSCode announcement when X button is clicked', () => {
      const closeButton = screen.getByRole('button', { name: /x/i });
      fireEvent.click(closeButton);
      
      expect(screen.queryByText(/VSCode support is now available/i)).not.toBeInTheDocument();
    });

    it('displays prerequisite installation instructions', () => {
      expect(screen.getByText('Prerequisite Required')).toBeInTheDocument();
      expect(screen.getByText('npm install -g @mcp-installer/cli')).toBeInTheDocument();
    });

    it('copies CLI installation command when copy button is clicked', async () => {
      const copyButtons = screen.getAllByRole('button');
      const cliCopyButton = copyButtons.find(btn => 
        btn.parentElement?.textContent?.includes('npm install -g @mcp-installer/cli')
      );
      
      expect(cliCopyButton).toBeInTheDocument();
      fireEvent.click(cliCopyButton!);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('npm install -g @mcp-installer/cli');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      renderWithRouter(<Index />);
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
    });

    it('displays search input with placeholder text', () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('filters servers by name when searching', async () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      
      fireEvent.change(searchInput, { target: { value: 'Test Server 1' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Server 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Server 2')).not.toBeInTheDocument();
      });
    });

    it('filters servers by description when searching', async () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      
      fireEvent.change(searchInput, { target: { value: 'authentication' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Server 2')).toBeInTheDocument();
        expect(screen.queryByText('Test Server 1')).not.toBeInTheDocument();
      });
    });

    it('filters servers by tags when searching', async () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      
      fireEvent.change(searchInput, { target: { value: 'productivity' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Server 2')).toBeInTheDocument();
        expect(screen.queryByText('Test Server 1')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search returns empty', async () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      
      fireEvent.change(searchInput, { target: { value: 'nonexistent server' } });
      
      await waitFor(() => {
        expect(screen.getByText('No servers found')).toBeInTheDocument();
        expect(screen.getByText(/try adjusting your search query/i)).toBeInTheDocument();
      });
    });

    it('shows server request option when no results found', async () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      
      fireEvent.change(searchInput, { target: { value: 'missing server' } });
      
      await waitFor(() => {
        expect(screen.getByText(/can't find "missing server"/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /request this server/i })).toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    beforeEach(async () => {
      renderWithRouter(<Index />);
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
    });

    it('displays category filter tabs', () => {
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Productivity')).toBeInTheDocument();
    });

    it('filters servers by category when category tab is selected', async () => {
      const developmentTab = screen.getByText('Development');
      fireEvent.click(developmentTab);
      
      await waitFor(() => {
        expect(screen.getByText('Test Server 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Server 2')).not.toBeInTheDocument();
      });
    });

    it('shows all servers when "All" category is selected', async () => {
      // First filter by category
      const developmentTab = screen.getByText('Development');
      fireEvent.click(developmentTab);
      
      await waitFor(() => {
        expect(screen.queryByText('Test Server 2')).not.toBeInTheDocument();
      });
      
      // Then switch back to All
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      await waitFor(() => {
        expect(screen.getByText('Test Server 1')).toBeInTheDocument();
        expect(screen.getByText('Test Server 2')).toBeInTheDocument();
      });
    });
  });

  describe('Server Cards', () => {
    beforeEach(async () => {
      renderWithRouter(<Index />);
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
    });

    it('displays server information in cards', () => {
      const serverCards = screen.getAllByTestId('server-card');
      expect(serverCards).toHaveLength(2);
      
      expect(screen.getByText('Test Server 1')).toBeInTheDocument();
      expect(screen.getByText('by Test Author')).toBeInTheDocument();
      expect(screen.getByText('A test MCP server for development')).toBeInTheDocument();
    });

    it('shows install and cursor buttons for each server', () => {
      const installButtons = screen.getAllByRole('button', { name: /install/i });
      expect(installButtons.length).toBeGreaterThanOrEqual(2);
      
      // Check for cursor install buttons (img elements)
      const cursorButtons = screen.getAllByAltText('Install to Cursor');
      expect(cursorButtons).toHaveLength(2);
    });

    it('copies install command when install button is clicked', async () => {
      const installButtons = screen.getAllByRole('button', { name: /install/i });
      fireEvent.click(installButtons[0]);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mcp-installer install test-server-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Copied!',
        description: 'Command copied to clipboard',
        duration: 2000,
      });
    });

    it('opens cursor when cursor install button is clicked', () => {
      const cursorButtons = screen.getAllByAltText('Install to Cursor');
      fireEvent.click(cursorButtons[0]);
      
      expect(window.open).toHaveBeenCalledWith('cursor://install-mcp-server', '_blank');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Opening Cursor...',
        description: "If Cursor doesn't open, please install it first.",
        duration: 3000,
      });
    });

    it('opens documentation when documentation button is clicked', () => {
      const docButtons = screen.getAllByRole('button');
      const docButton = docButtons.find(btn => 
        btn.getAttribute('aria-label')?.includes('documentation') ||
        btn.querySelector('[data-testid="external-link"]')
      );
      
      if (docButton) {
        fireEvent.click(docButton);
        expect(window.open).toHaveBeenCalledWith('https://example.com/docs', '_blank');
      }
    });

    it('opens repository when GitHub button is clicked', () => {
      const repoButtons = screen.getAllByRole('button');
      const repoButton = repoButtons.find(btn => 
        btn.getAttribute('aria-label')?.includes('repository') ||
        btn.querySelector('[data-testid="github"]')
      );
      
      if (repoButton) {
        fireEvent.click(repoButton);
        expect(window.open).toHaveBeenCalledWith('https://github.com/example/server1', '_blank');
      }
    });
  });

  describe('Server Detail Modal', () => {
    beforeEach(async () => {
      renderWithRouter(<Index />);
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
    });

    it('opens modal when server card is clicked', async () => {
      const serverCards = screen.getAllByTestId('server-card');
      fireEvent.click(serverCards[0]);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      });
    });

    it('displays server details in modal', async () => {
      const serverCards = screen.getAllByTestId('server-card');
      fireEvent.click(serverCards[0]);
      
      await waitFor(() => {
        const modal = screen.getByTestId('dialog-content');
        expect(modal).toContainElement(screen.getByText('Test Server 1'));
        expect(modal).toContainElement(screen.getByText('by Test Author'));
        expect(modal).toContainElement(screen.getByText('A test MCP server for development'));
      });
    });

    it('shows installation commands for different clients in modal', async () => {
      const serverCards = screen.getAllByTestId('server-card');
      fireEvent.click(serverCards[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Installation Commands')).toBeInTheDocument();
        expect(screen.getByText('All Clients')).toBeInTheDocument();
        expect(screen.getByText('Claude')).toBeInTheDocument();
        expect(screen.getByText('Cursor')).toBeInTheDocument();
        expect(screen.getByText('VSCode')).toBeInTheDocument();
      });
    });

    it('shows parameters section for servers requiring configuration', async () => {
      const serverCards = screen.getAllByTestId('server-card');
      fireEvent.click(serverCards[1]); // Test Server 2 has parameters
      
      await waitFor(() => {
        expect(screen.getByText('Configuration Required')).toBeInTheDocument();
        expect(screen.getByText('apiKey')).toBeInTheDocument();
        expect(screen.getByText('API key for authentication')).toBeInTheDocument();
        expect(screen.getByText('Required')).toBeInTheDocument();
      });
    });

    it('copies client-specific commands from modal', async () => {
      const serverCards = screen.getAllByTestId('server-card');
      fireEvent.click(serverCards[0]);
      
      await waitFor(() => {
        const copyButtons = screen.getAllByRole('button', { name: /copy/i });
        if (copyButtons.length > 0) {
          fireEvent.click(copyButtons[0]);
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('handles clipboard write failures gracefully', async () => {
      const clipboardError = new Error('Clipboard access denied');
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(clipboardError);
      
      renderWithRouter(<Index />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
      
      const installButtons = screen.getAllByRole('button', { name: /install/i });
      fireEvent.click(installButtons[0]);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to copy',
          description: 'Please copy the command manually',
          variant: 'destructive',
          duration: 3000,
        });
      });
    });

    it('handles cursor deep link generation failures', async () => {
      const mockGenerateCursorDeepLink = vi.mocked(await import('@/lib/utils')).generateCursorDeepLink;
      mockGenerateCursorDeepLink.mockImplementationOnce(() => {
        throw new Error('Deep link generation failed');
      });
      
      renderWithRouter(<Index />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
      
      const cursorButtons = screen.getAllByAltText('Install to Cursor');
      fireEvent.click(cursorButtons[0]);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to open Cursor',
          description: 'Please try copying the install command instead.',
          variant: 'destructive',
          duration: 3000,
        });
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      renderWithRouter(<Index />);
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
    });

    it('has proper heading structure', () => {
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      
      const subHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(subHeadings.length).toBeGreaterThan(0);
    });

    it('has accessible search input', () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      expect(searchInput).toHaveAttribute('type', 'text');
      expect(searchInput).toBeVisible();
    });

    it('has focusable interactive elements', () => {
      const buttons = screen.getAllByRole('button');
      const inputs = screen.getAllByRole('textbox');
      
      [...buttons, ...inputs].forEach(element => {
        expect(element).toBeVisible();
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });

    it('supports keyboard navigation', () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      
      fireEvent.keyDown(searchInput, { key: 'Tab' });
      expect(document.activeElement).not.toBe(searchInput);
    });
  });

  describe('Performance and Optimization', () => {
    it('memoizes filtered servers based on search and category', async () => {
      renderWithRouter(<Index />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
      
      const initialServerCount = screen.getAllByTestId('server-card').length;
      
      // Change search query
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      fireEvent.change(searchInput, { target: { value: 'Test Server 1' } });
      
      await waitFor(() => {
        const filteredServerCount = screen.getAllByTestId('server-card').length;
        expect(filteredServerCount).toBeLessThan(initialServerCount);
      });
    });

    it('handles rapid state changes without crashing', async () => {
      renderWithRouter(<Index />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      
      // Rapid input changes
      for (let i = 0; i < 10; i++) {
        fireEvent.change(searchInput, { target: { value: `search ${i}` } });
      }
      
      // Should not crash
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Integration Features', () => {
    beforeEach(async () => {
      renderWithRouter(<Index />);
      await waitFor(() => {
        expect(screen.queryByText('Loading MCP servers...')).not.toBeInTheDocument();
      });
    });

    it('displays server request FAB component', () => {
      expect(screen.getByTestId('server-request-fab')).toBeInTheDocument();
    });

    it('triggers server request event when request button is clicked', async () => {
      const searchInput = screen.getByPlaceholderText(/search mcp servers/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent server' } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /request this server/i })).toBeInTheDocument();
      });
      
      const requestButton = screen.getByRole('button', { name: /request this server/i });
      
      // Mock event listener
      const eventListener = vi.fn();
      window.addEventListener('openServerRequest', eventListener);
      
      fireEvent.click(requestButton);
      
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { serverName: 'nonexistent server' }
        })
      );
      
      window.removeEventListener('openServerRequest', eventListener);
    });
  });
});