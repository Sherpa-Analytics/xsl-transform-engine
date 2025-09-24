import { useQuery } from "@tanstack/react-query";

interface ErrorLogProps {
  transformations: any[];
}

export default function ErrorLog({ transformations }: ErrorLogProps) {
  const failedTransformations = transformations.filter(t => 
    t.status === 'failed' && t.errorMessage
  );

  const { data: filesData } = useQuery({
    queryKey: ["/api/files"],
  });

  const files = (filesData as any)?.files || [];

  const getFileName = (fileId: string) => {
    const file = files.find((f: any) => f.id === fileId);
    return file ? file.originalName : `File ${fileId.slice(0, 8)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Error Log</h2>
          <button 
            className="text-slate-500 hover:text-slate-700 text-sm"
            data-testid="button-clear-errors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {failedTransformations.length > 0 ? (
            failedTransformations.map((transformation) => (
              <div key={transformation.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-exclamation-triangle text-red-500 text-sm mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Transformation Failed</p>
                    <p className="text-xs text-red-700 mt-1 font-medium">
                      Files: {getFileName(transformation.xmlFileId)} + {getFileName(transformation.xslFileId)}
                    </p>
                    <p className="text-xs text-red-600 mt-1" data-testid={`text-error-${transformation.id}`}>
                      {transformation.errorMessage}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      ID: {transformation.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-500">
              <i className="fas fa-check-circle text-2xl mb-2 text-green-400"></i>
              <p className="text-sm">No errors to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
