import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface DebugConsoleProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'debug';
  message: string;
  id: string;
}

export default function DebugConsole({ isOpen, onToggle }: DebugConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isOpen && !wsRef.current) {
      // Connect to debug logs via WebSocket (we'll implement this)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/debug`;
      
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          addLog('info', 'Debug console connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addLog(data.level || 'info', data.message, data.transformationId);
          } catch (e) {
            addLog('info', event.data);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          addLog('warning', 'Debug console disconnected');
        };

        ws.onerror = () => {
          setIsConnected(false);
          addLog('error', 'WebSocket connection failed - using polling instead');
          startPolling();
        };
      } catch (e) {
        addLog('error', 'WebSocket not supported - using polling');
        startPolling();
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen]);

  const startPolling = () => {
    // Fallback: poll for debug information
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/debug/logs');
        if (response.ok) {
          const data = await response.json();
          if (data.logs && data.logs.length > 0) {
            data.logs.forEach((log: any) => {
              addLog(log.level, log.message, log.transformationId);
            });
          }
        }
      } catch (e) {
        // Silent fail for polling
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const addLog = (level: LogEntry['level'], message: string, transformationId?: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message: transformationId ? `[${transformationId.slice(0, 8)}] ${message}` : message
    };

    setLogs(prev => {
      const newLogs = [...prev, newLog];
      // Keep only last 100 logs
      return newLogs.slice(-100);
    });
  };

  useEffect(() => {
    // Auto-scroll to bottom
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'debug': return 'text-blue-600';
      default: return 'text-slate-700';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      case 'debug': return 'fas fa-bug';
      default: return 'fas fa-info-circle';
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-4 py-2 rounded-lg font-medium"
          data-testid="button-show-debug"
        >
          <i className="fas fa-terminal mr-2"></i>
          Show Console
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-slate-900 rounded-lg shadow-2xl border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <i className="fas fa-terminal text-green-400"></i>
          <span className="text-sm font-medium text-white">Debug Console</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearLogs}
            className="text-slate-400 hover:text-white h-6 w-6 p-0"
            data-testid="button-clear-logs"
          >
            <i className="fas fa-trash text-xs"></i>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            className="text-slate-300 hover:text-white hover:bg-slate-700 h-8 w-8 p-0 rounded-md border border-slate-600"
            data-testid="button-hide-debug"
            title="Close Console"
          >
            <i className="fas fa-times text-sm"></i>
          </Button>
        </div>
      </div>

      {/* Logs */}
      <div className="h-72 overflow-y-auto p-2 bg-black text-xs font-mono">
        {logs.length === 0 ? (
          <div className="text-slate-500 text-center py-4">
            <i className="fas fa-hourglass-half mb-2"></i>
            <p>Waiting for debug messages...</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 py-1 hover:bg-slate-800 rounded">
              <span className="text-slate-500 flex-shrink-0">{log.timestamp}</span>
              <i className={`${getLevelIcon(log.level)} ${getLevelColor(log.level)} flex-shrink-0 mt-0.5`}></i>
              <span className={`${getLevelColor(log.level)} break-words`}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700 bg-slate-800 rounded-b-lg">
        <p className="text-xs text-slate-400 text-center">
          {logs.length} messages • {isConnected ? 'Live' : 'Polling'}
        </p>
      </div>
    </div>
  );
}