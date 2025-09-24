import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  accept: string;
  fileType: string;
  onUploadComplete: () => void;
}

export default function FileUpload({ accept, fileType, onUploadComplete }: FileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await apiRequest("POST", "/api/upload", formData);
      const result = await response.json();
      
      toast({
        title: "Upload Complete",
        description: result.message || `${files.length} file(s) uploaded successfully`,
      });
      
      onUploadComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        data-testid={`input-${fileType}-files`}
      />
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer group transition-colors ${
          isDragOver ? 'border-primary-400 bg-primary-50' : 'border-slate-300 hover:border-primary-400'
        }`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid={`dropzone-${fileType}`}
      >
        <div className="space-y-3">
          <i className={`fas fa-cloud-upload-alt text-3xl transition-colors ${
            isDragOver ? 'text-primary-500' : 'text-slate-400 group-hover:text-primary-500'
          }`}></i>
          <div>
            <p className="text-slate-600 font-medium">
              Drop {fileType.toUpperCase()} files here or click to browse
            </p>
            <p className="text-sm text-slate-500">
              {fileType === 'xsl' ? 'Dependencies will be resolved automatically' : 'Supports multiple file selection'}
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            data-testid={`button-select-${fileType}-files`}
          >
            {isUploading ? 'Uploading...' : `Select ${fileType.toUpperCase()} Files`}
          </button>
        </div>
      </div>
    </div>
  );
}
