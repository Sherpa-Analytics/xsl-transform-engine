interface TransformationResultsProps {
  transformations: any[];
}

export default function TransformationResults({ transformations }: TransformationResultsProps) {
  const completedTransformations = transformations.filter(t => t.status === 'completed');

  const handlePreview = (transformationId: string) => {
    window.open(`/api/transformations/${transformationId}/result`, '_blank');
  };

  const handleDownload = (transformationId: string) => {
    window.open(`/api/transformations/${transformationId}/download`, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Transformation Results</h2>
        <p className="text-sm text-slate-600">View and download your transformed documents</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {completedTransformations.length > 0 ? (
            completedTransformations.map((transformation) => (
              <div key={transformation.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <i className="fas fa-file-alt text-green-600"></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900" data-testid={`text-result-${transformation.id}`}>
                        Transformation {transformation.id.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-slate-500">Transformed successfully</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      onClick={() => handlePreview(transformation.id)}
                      data-testid={`button-preview-${transformation.id}`}
                    >
                      <i className="fas fa-eye mr-1"></i>Preview
                    </button>
                    <button 
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      onClick={() => handleDownload(transformation.id)}
                      data-testid={`button-download-${transformation.id}`}
                    >
                      <i className="fas fa-download mr-1"></i>Download
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 rounded p-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Processing time:</span>
                    <span className="font-medium" data-testid={`text-processing-time-${transformation.id}`}>
                      {transformation.processingTime || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Output size:</span>
                    <span className="font-medium" data-testid={`text-output-size-${transformation.id}`}>
                      {transformation.outputSize || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <i className="fas fa-file-export text-4xl mb-4 text-slate-300"></i>
              <p className="font-medium">No transformations yet</p>
              <p className="text-sm">Upload files and start a transformation to see results here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
