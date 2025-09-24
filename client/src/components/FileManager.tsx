import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface FileManagerProps {
  files: any[];
  onFileDeleted: () => void;
}

export default function FileManager({ files, onFileDeleted }: FileManagerProps) {
  const { toast } = useToast();
  const [previewContent, setPreviewContent] = useState<{filename: string, content: string, mimeType: string} | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleDeleteFile = async (fileId: string, filename: string) => {
    try {
      await apiRequest("DELETE", `/api/files/${fileId}`);
      
      toast({
        title: "Success",
        description: `${filename} deleted successfully`,
      });
      
      onFileDeleted();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = (fileId: string, filename: string) => {
    window.open(`/api/files/${fileId}/download`, '_blank');
  };

  const handlePreviewFile = async (fileId: string, filename: string) => {
    setIsPreviewLoading(true);
    try {
      const response = await fetch(`/api/files/${fileId}/preview`);
      if (!response.ok) {
        throw new Error('Failed to load preview');
      }
      const data = await response.json();
      setPreviewContent(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to preview file",
        variant: "destructive",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const [xsdPreview, setXsdPreview] = useState<{filename: string, content: string} | null>(null);
  const [isXsdGenerating, setIsXsdGenerating] = useState(false);

  const handleGenerateXsd = async (fileId: string, filename: string, sourceType: 'xml' | 'xsl') => {
    setIsXsdGenerating(true);
    try {
      // Use direct fetch instead of apiRequest to avoid any response processing issues
      const response = await fetch(`/api/files/${fileId}/generate-xsd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceType })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('XSD Generation Response:', {
        filename: data.suggestedFilename,
        contentLength: data.xsdContent?.length,
        contentPreview: data.xsdContent?.substring(0, 100)
      });
      
      // Show the XSD content in a preview dialog
      setXsdPreview({
        filename: data.suggestedFilename || 'generated.xsd',
        content: data.xsdContent || 'No content generated'
      });

      toast({
        title: "Success",
        description: `XSD schema generated! Preview and save as ${data.suggestedFilename || 'generated.xsd'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate XSD",
        variant: "destructive",
      });
    } finally {
      setIsXsdGenerating(false);
    }
  };

  const handleSaveXsd = () => {
    if (!xsdPreview) return;
    
    // Create and download the XSD file
    const blob = new Blob([xsdPreview.content], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = xsdPreview.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Downloaded",
      description: `XSD file saved as ${xsdPreview.filename}`,
    });
    
    setXsdPreview(null);
  };

  const formatFileSize = (sizeStr: string) => {
    const size = parseInt(sizeStr);
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const getFileIcon = (file: any) => {
    if (file.originalName.toLowerCase().endsWith('.xsd')) {
      return 'fas fa-shield-alt text-purple-600';
    }
    if (file.mimeType.includes('xml') || file.originalName.endsWith('.xml')) {
      return 'fas fa-file-code text-blue-600';
    }
    if (file.mimeType.includes('xsl') || file.originalName.endsWith('.xsl')) {
      return 'fas fa-file-alt text-green-600';
    }
    return 'fas fa-file text-slate-600';
  };

  const getFileBackgroundColor = (file: any) => {
    if (file.originalName.toLowerCase().endsWith('.xsd')) {
      return 'bg-purple-100';
    }
    if (file.mimeType.includes('xml') || file.originalName.endsWith('.xml')) {
      return 'bg-blue-100';
    }
    if (file.mimeType.includes('xsl') || file.originalName.endsWith('.xsl')) {
      return 'bg-green-100';
    }
    return 'bg-slate-100';
  };

  const getValidationIcon = (validationStatus: string) => {
    switch (validationStatus) {
      case 'valid':
        return 'fas fa-check-circle text-green-500';
      case 'invalid':
        return 'fas fa-times-circle text-red-500';
      case 'pending':
        return 'fas fa-clock text-yellow-500';
      default:
        return 'fas fa-question-circle text-slate-400';
    }
  };

  const getValidationText = (validationStatus: string) => {
    switch (validationStatus) {
      case 'valid':
        return 'Valid';
      case 'invalid':
        return 'Invalid';
      case 'pending':
        return 'Validating...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">File Manager</h2>
          <button 
            className="text-slate-500 hover:text-slate-700 text-sm"
            data-testid="button-refresh-files"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-slate-200">
        {files.length > 0 ? (
          files.map((file) => (
            <div key={file.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`p-2 rounded ${getFileBackgroundColor(file)}`}>
                    <i className={`${getFileIcon(file)} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-slate-900 truncate" data-testid={`text-filename-${file.id}`}>
                        {file.originalName}
                      </p>
                      <div className="flex items-center space-x-1" data-testid={`validation-status-${file.id}`}>
                        <i className={`${getValidationIcon(file.validationStatus || 'pending')} text-xs`}></i>
                        <span className="text-xs font-medium">
                          {getValidationText(file.validationStatus || 'pending')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500" data-testid={`text-filesize-${file.id}`}>
                        {formatFileSize(file.size)}
                      </p>
                      {file.validationError && (
                        <p className="text-xs text-red-500 truncate max-w-48" title={file.validationError} data-testid={`text-validation-error-${file.id}`}>
                          {file.validationError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Preview Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button 
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        onClick={() => handlePreviewFile(file.id, file.originalName)}
                        data-testid={`button-preview-${file.id}`}
                        title="Preview file content"
                      >
                        Preview
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="text-left">
                          {isPreviewLoading ? "Loading..." : previewContent?.filename || "File Preview"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 max-h-[60vh] overflow-auto">
                        {isPreviewLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <i className="fas fa-spinner fa-spin text-xl text-slate-400"></i>
                          </div>
                        ) : previewContent ? (
                          <pre className="text-sm text-slate-700 bg-slate-50 p-4 rounded border overflow-x-auto whitespace-pre-wrap break-words">
                            {previewContent.content}
                          </pre>
                        ) : (
                          <p className="text-slate-500 text-center p-8">No preview available</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Generate XSD Button - Only show for XML/XSL files */}
                  {(file.mimeType.includes('xml') || file.originalName.endsWith('.xml') || 
                    file.mimeType.includes('xsl') || file.originalName.endsWith('.xsl')) && (
                    <button 
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                      onClick={() => handleGenerateXsd(
                        file.id, 
                        file.originalName, 
                        file.mimeType.includes('xsl') || file.originalName.endsWith('.xsl') ? 'xsl' : 'xml'
                      )}
                      data-testid={`button-generate-xsd-${file.id}`}
                      title={`Generate XSD schema from ${file.originalName}`}
                    >
                      Gen XSD
                    </button>
                  )}
                  
                  <button 
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    onClick={() => handleDownloadFile(file.id, file.originalName)}
                    data-testid={`button-download-${file.id}`}
                    title="Download file"
                  >
                    Download
                  </button>
                  <button 
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    onClick={() => handleDeleteFile(file.id, file.originalName)}
                    data-testid={`button-delete-${file.id}`}
                    title="Delete file"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500">
            <i className="fas fa-folder-open text-2xl mb-2 text-slate-300"></i>
            <p className="text-sm">No files uploaded</p>
          </div>
        )}
      </div>

      {/* XSD Preview Dialog */}
      <Dialog open={!!xsdPreview} onOpenChange={() => setXsdPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-left">
              Generated XSD Schema: {xsdPreview?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-auto">
            {xsdPreview ? (
              <pre className="text-sm text-slate-700 bg-slate-50 p-4 rounded border overflow-x-auto whitespace-pre-wrap break-words">
                {xsdPreview.content}
              </pre>
            ) : (
              <div className="flex items-center justify-center p-8">
                <i className="fas fa-spinner fa-spin text-xl text-slate-400"></i>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button 
              className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
              onClick={() => setXsdPreview(null)}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              onClick={handleSaveXsd}
            >
              Save as {xsdPreview?.filename}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
