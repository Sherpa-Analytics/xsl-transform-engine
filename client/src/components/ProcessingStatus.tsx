import { useQuery } from "@tanstack/react-query";

interface ProcessingStatusProps {
  transformations: any[];
}

export default function ProcessingStatus({ transformations }: ProcessingStatusProps) {
  const activeTransformations = transformations.filter(t => 
    t.status === 'queued' || t.status === 'processing'
  );
  
  // Show recent completed transformations (last 3)
  const recentCompleted = transformations
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const { data: filesData } = useQuery({
    queryKey: ["/api/files"],
  });

  const files = (filesData as any)?.files || [];

  // Add debug logging
  console.log('ProcessingStatus Debug:', {
    totalTransformations: transformations.length,
    activeTransformations: activeTransformations.length,
    transformationStatuses: transformations.map(t => ({ id: t.id.slice(0, 8), status: t.status, progress: t.progress }))
  });

  const getFileName = (fileId: string) => {
    const file = files.find((f: any) => f.id === fileId);
    return file ? file.originalName : `File ${fileId.slice(0, 8)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Processing Status</h2>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {/* Active Transformations */}
          {activeTransformations.map((transformation) => (
            <div key={transformation.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-blue-900" data-testid={`text-processing-${transformation.id}`}>
                    {getFileName(transformation.xmlFileId)} + {getFileName(transformation.xslFileId)}
                  </span>
                  <p className="text-xs text-blue-600 mt-1">ID: {transformation.id.slice(0, 8)}</p>
                </div>
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                  {transformation.status === 'processing' ? 'Processing' : 'Queued'}
                </span>
              </div>
              {transformation.status === 'processing' && (
                <>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${transformation.progress || 0}%` }}
                      data-testid={`progress-${transformation.id}`}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-700 mt-1" data-testid={`text-status-${transformation.id}`}>
                    {transformation.statusMessage || 
                      (() => {
                        const progress = parseInt(transformation.progress || '0');
                        if (progress < 15) return 'Initializing...';
                        if (progress < 30) return 'Processing...';
                        if (progress < 50) return 'Resolving dependencies...';
                        if (progress < 75) return 'Transforming...';
                        if (progress < 100) return 'Finalizing...';
                        return 'Complete';
                      })()
                    }
                  </p>
                </>
              )}
              {transformation.status === 'queued' && (
                <p className="text-xs text-blue-500 mt-1">Waiting to process...</p>
              )}
            </div>
          ))}
          
          {/* Recent Completed Transformations */}
          {recentCompleted.map((transformation) => (
            <div key={transformation.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-green-900" data-testid={`text-completed-${transformation.id}`}>
                    {getFileName(transformation.xmlFileId)} + {getFileName(transformation.xslFileId)}
                  </span>
                  <p className="text-xs text-green-600 mt-1">ID: {transformation.id.slice(0, 8)}</p>
                </div>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                  ✅ Completed
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: '100%' }}
                  data-testid={`progress-completed-${transformation.id}`}
                ></div>
              </div>
              <p className="text-xs text-green-700 mt-1" data-testid={`text-completed-status-${transformation.id}`}>
                {transformation.statusMessage || '✅ Transformation completed successfully'}
              </p>
            </div>
          ))}
          
          {activeTransformations.length === 0 && recentCompleted.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              <i className="fas fa-tasks text-2xl mb-2 text-slate-300"></i>
              <p className="text-sm">No active processes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
