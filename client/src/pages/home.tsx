import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FileUpload from "@/components/FileUpload";
import ProcessingStatus from "@/components/ProcessingStatus";
import FileManager from "@/components/FileManager";
import ErrorLog from "@/components/ErrorLog";
import TransformationResults from "@/components/TransformationResults";
import DebugConsole from "@/components/DebugConsole";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { toast } = useToast();
  const [transformationSettings, setTransformationSettings] = useState({
    validateXml: true,
    resolveDeps: true,
    generatePreview: false,
    validateWithXsd: false,
  });
  const [selectedFiles, setSelectedFiles] = useState({
    xmlFileId: "",
    xslFileId: "",
    xsdFileId: "",
  });
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(false);

  const { data: filesData, refetch: refetchFiles } = useQuery({
    queryKey: ["/api/files"],
  });

  const { data: transformationsData, refetch: refetchTransformations } = useQuery({
    queryKey: ["/api/transformations"],
    refetchInterval: (data) => {
      // Aggressive polling for active transformations
      const transformations = (data as any)?.transformations || [];
      const hasActive = transformations.some((t: any) => t.status === 'processing' || t.status === 'queued');
      // Poll every 1 second for active, every 5 seconds for completed-only
      return hasActive ? 1000 : 5000;
    },
    refetchIntervalInBackground: true,
    staleTime: 0, // Always fetch fresh data
  });

  const files = (filesData as any)?.files || [];
  const transformations = (transformationsData as any)?.transformations || [];

  const xmlFiles = files.filter((file: any) => 
    file.mimeType.includes('xml') || file.originalName.endsWith('.xml')
  );
  const xslFiles = files.filter((file: any) => 
    file.mimeType.includes('xsl') || file.originalName.endsWith('.xsl')
  );
  const xsdFiles = files.filter((file: any) => 
    file.originalName.toLowerCase().endsWith('.xsd')
  );

  const handleStartTransformation = async () => {
    if (!selectedFiles.xmlFileId || !selectedFiles.xslFileId) {
      toast({
        title: "Error",
        description: "Please select both XML and XSL files",
        variant: "destructive",
      });
      return;
    }

    // Check if XSD validation is enabled but no XSD file selected
    if (transformationSettings.validateWithXsd && !selectedFiles.xsdFileId) {
      toast({
        title: "Error", 
        description: "Please select an XSD file for schema validation or disable XSD validation",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/transform", {
        ...selectedFiles,
        ...transformationSettings,
      });

      toast({
        title: "Success",
        description: "Transformation started successfully",
      });

      // Immediate refetch + delayed refetch to catch completion  
      refetchTransformations();
      setTimeout(() => refetchTransformations(), 500);
      setTimeout(() => refetchTransformations(), 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start transformation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <i className="fas fa-exchange-alt text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">XML/XSLT Transformer</h1>
                <p className="text-sm text-slate-500">Transform XML documents with XSL stylesheets</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-slate-500 hover:text-slate-700 transition-colors" data-testid="button-help">
                <i className="fas fa-question-circle text-lg"></i>
              </button>
              <button className="text-slate-500 hover:text-slate-700 transition-colors" data-testid="button-settings">
                <i className="fas fa-cog text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: File Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* File Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Upload Files</h2>
                <p className="text-sm text-slate-600">Upload your XML documents and XSL stylesheets for transformation</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* XML File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    <i className="fas fa-file-code text-blue-500 mr-2"></i>
                    XML Documents
                  </label>
                  <FileUpload 
                    accept=".xml,text/xml,application/xml"
                    fileType="xml"
                    onUploadComplete={refetchFiles}
                  />
                </div>

                {/* XSL File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    <i className="fas fa-file-alt text-green-500 mr-2"></i>
                    XSL Stylesheets
                  </label>
                  <FileUpload 
                    accept=".xsl,.xslt,text/xsl,application/xslt+xml"
                    fileType="xsl"
                    onUploadComplete={refetchFiles}
                  />
                </div>

                {/* XSD File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    <i className="fas fa-file-shield text-purple-500 mr-2"></i>
                    XSD Schema Files <span className="text-xs text-slate-500">(Optional)</span>
                  </label>
                  <FileUpload 
                    accept=".xsd"
                    fileType="xsd"
                    onUploadComplete={refetchFiles}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Upload XSD files to validate XML structure and compliance beyond basic well-formedness
                  </p>
                </div>

                {/* File Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select XML File</label>
                    <select 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                      value={selectedFiles.xmlFileId}
                      onChange={(e) => setSelectedFiles(prev => ({ ...prev, xmlFileId: e.target.value }))}
                      data-testid="select-xml-file"
                    >
                      <option value="">Choose XML file...</option>
                      {xmlFiles.map((file: any) => (
                        <option key={file.id} value={file.id}>
                          {file.originalName} ({file.validationStatus === 'valid' ? '✓ Valid' : file.validationStatus === 'invalid' ? '✗ Invalid' : '⏳ Validating'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select XSL File</label>
                    <select 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                      value={selectedFiles.xslFileId}
                      onChange={(e) => setSelectedFiles(prev => ({ ...prev, xslFileId: e.target.value }))}
                      data-testid="select-xsl-file"
                    >
                      <option value="">Choose XSL file...</option>
                      {xslFiles.map((file: any) => (
                        <option key={file.id} value={file.id}>
                          {file.originalName} ({file.validationStatus === 'valid' ? '✓ Valid' : file.validationStatus === 'invalid' ? '✗ Invalid' : '⏳ Validating'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select XSD File <span className="text-xs text-slate-500">(Optional)</span>
                      {!transformationSettings.validateWithXsd && (
                        <span className="block text-xs text-amber-600 mt-1">
                          ⚠️ Enable "Validate XML against XSD schema" below to select XSD file
                        </span>
                      )}
                    </label>
                    <select 
                      className={`w-full border border-slate-300 rounded-md px-3 py-2 text-sm ${
                        !transformationSettings.validateWithXsd ? 'bg-slate-100 text-slate-500' : ''
                      }`}
                      value={selectedFiles.xsdFileId}
                      onChange={(e) => setSelectedFiles(prev => ({ ...prev, xsdFileId: e.target.value }))}
                      data-testid="select-xsd-file"
                      disabled={!transformationSettings.validateWithXsd}
                    >
                      <option value="">Choose XSD file...</option>
                      {xsdFiles.map((file: any) => (
                        <option key={file.id} value={file.id}>
                          {file.originalName} ({file.validationStatus === 'valid' ? '✓ Valid' : file.validationStatus === 'invalid' ? '✗ Invalid' : '⏳ Validating'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transformation Settings */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Transformation Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="validate-xml"
                        checked={transformationSettings.validateXml}
                        onCheckedChange={(checked) => 
                          setTransformationSettings(prev => ({ ...prev, validateXml: !!checked }))
                        }
                        data-testid="checkbox-validate-xml"
                      />
                      <label htmlFor="validate-xml" className="text-sm text-slate-600">
                        Validate XML before transformation
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="resolve-deps"
                        checked={transformationSettings.resolveDeps}
                        onCheckedChange={(checked) => 
                          setTransformationSettings(prev => ({ ...prev, resolveDeps: !!checked }))
                        }
                        data-testid="checkbox-resolve-deps"
                      />
                      <label htmlFor="resolve-deps" className="text-sm text-slate-600">
                        Auto-resolve XSL dependencies
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="generate-preview"
                        checked={transformationSettings.generatePreview}
                        onCheckedChange={(checked) => 
                          setTransformationSettings(prev => ({ ...prev, generatePreview: !!checked }))
                        }
                        data-testid="checkbox-generate-preview"
                      />
                      <label htmlFor="generate-preview" className="text-sm text-slate-600">
                        Generate HTML preview
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="validate-with-xsd"
                        checked={transformationSettings.validateWithXsd}
                        onCheckedChange={(checked) => {
                          setTransformationSettings(prev => ({ ...prev, validateWithXsd: !!checked }));
                          // Clear XSD selection if validation is disabled
                          if (!checked) {
                            setSelectedFiles(prev => ({ ...prev, xsdFileId: "" }));
                          }
                        }}
                        data-testid="checkbox-validate-with-xsd"
                      />
                      <label htmlFor="validate-with-xsd" className="text-sm text-slate-600">
                        Validate XML against XSD schema <span className="text-xs text-slate-500">(requires XSD file)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Transform Button */}
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={handleStartTransformation}
                    className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center space-x-2"
                    data-testid="button-start-transformation"
                  >
                    <i className="fas fa-play"></i>
                    <span>Start Transformation</span>
                  </Button>
                </div>
              </div>
            </div>

            <TransformationResults transformations={transformations} />
          </div>

          {/* Right Column: Status and File Management */}
          <div className="space-y-6">
            <ProcessingStatus transformations={transformations} />
            <FileManager files={files} onFileDeleted={refetchFiles} />
            <ErrorLog transformations={transformations} />
          </div>
        </div>
      </main>

      {/* Debug Console */}
      <DebugConsole 
        isOpen={debugConsoleOpen} 
        onToggle={() => setDebugConsoleOpen(!debugConsoleOpen)}
      />
    </div>
  );
}
