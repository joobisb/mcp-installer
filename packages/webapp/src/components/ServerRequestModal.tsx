import React, { useState, useEffect } from 'react';
import { ExternalLink, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateGitHubIssueUrl, serverCategories } from '@/lib/github-issues';

interface ServerRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledServerName?: string;
}

export default function ServerRequestModal({
  open,
  onOpenChange,
  prefilledServerName,
}: ServerRequestModalProps) {
  const [formData, setFormData] = useState({
    serverName: '',
    githubUrl: '',
    documentationUrl: '',
    description: '',
    category: '',
    userEmail: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill server name when provided
  useEffect(() => {
    if (prefilledServerName) {
      setFormData((prev) => ({ ...prev, serverName: prefilledServerName }));
    }
  }, [prefilledServerName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serverName.trim()) {
      alert('Please provide a server name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate GitHub issue URL with form data
      const issueUrl = generateGitHubIssueUrl(formData);

      // Open GitHub issue in new tab
      window.open(issueUrl, '_blank');

      // Close modal and reset form
      onOpenChange(false);
      setFormData({
        serverName: '',
        githubUrl: '',
        documentationUrl: '',
        description: '',
        category: '',
        userEmail: '',
      });
    } catch (error) {
      console.error('Error creating server request:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Server className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Request New MCP Server
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Help us expand our server registry by requesting a new MCP server
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="serverName" className="text-sm font-medium text-gray-900">
              Server Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="serverName"
              type="text"
              placeholder="e.g., Slack MCP Server"
              value={formData.serverName}
              onChange={(e) => updateFormData('serverName')(e.target.value)}
              className="w-full"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium text-gray-900">
              Category
            </Label>
            <Select value={formData.category} onValueChange={updateFormData('category')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {serverCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'ai' || category === 'crm'
                      ? category.toUpperCase()
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GitHub URL */}
          <div className="space-y-2">
            <Label htmlFor="githubUrl" className="text-sm font-medium text-gray-900">
              GitHub Repository URL
            </Label>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/username/mcp-server-name"
              value={formData.githubUrl}
              onChange={(e) => updateFormData('githubUrl')(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Link to the server's GitHub repository (helps us research installation)
            </p>
          </div>

          {/* Documentation URL */}
          <div className="space-y-2">
            <Label htmlFor="documentationUrl" className="text-sm font-medium text-gray-900">
              Documentation URL
            </Label>
            <Input
              id="documentationUrl"
              type="url"
              placeholder="https://docs.example.com/mcp-server"
              value={formData.documentationUrl}
              onChange={(e) => updateFormData('documentationUrl')(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Link to installation docs or npm package page</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-900">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Briefly describe what this MCP server does and why it would be useful..."
              value={formData.description}
              onChange={(e) => updateFormData('description')(e.target.value)}
              className="w-full min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="userEmail" className="text-sm font-medium text-gray-900">
              Your Email (Optional)
            </Label>
            <Input
              id="userEmail"
              type="email"
              placeholder="your.email@example.com"
              value={formData.userEmail}
              onChange={(e) => updateFormData('userEmail')(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              We may contact you for clarification or to notify when the server is added
            </p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">How this works</p>
                <p className="text-sm text-blue-700">
                  Clicking "Submit Request" will open a new GitHub issue with your information
                  pre-filled. You can edit the issue before submitting it, and track progress there.
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.serverName.trim()}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? (
                'Opening GitHub...'
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
