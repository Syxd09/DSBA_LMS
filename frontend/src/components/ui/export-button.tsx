import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, File, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api';

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

interface ExportButtonProps {
  /** API endpoint path (e.g., "/export/student/performance") */
  endpoint: string;
  /** Query parameters to include */
  params?: Record<string, any>;
  /** Base filename for download */
  filename?: string;
  /** Button size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Available formats (default: all) */
  formats?: ExportFormat[];
  /** Callback on export start */
  onExportStart?: () => void;
  /** Callback on export complete */
  onExportComplete?: (format: ExportFormat) => void;
  /** Callback on export error */
  onExportError?: (error: Error) => void;
}

const FORMAT_ICONS = {
  json: FileJson,
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  pdf: File,
};

const FORMAT_LABELS = {
  json: 'JSON',
  csv: 'CSV',
  xlsx: 'Excel',
  pdf: 'PDF',
};

export function ExportButton({
  endpoint,
  params = {},
  filename = 'export',
  size = 'sm',
  formats = ['json', 'csv', 'xlsx', 'pdf'],
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportingFormat(format);
    onExportStart?.();

    try {
      const response = await apiClient.get(endpoint, {
        params: { ...params, format },
        responseType: format === 'json' ? 'json' : 'blob',
      });

      // Handle download
      if (format === 'json') {
        // JSON: create blob from response data
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
        downloadBlob(blob, `${filename}.json`);
      } else {
        // Binary formats: response is already a blob
        const contentType = response.headers['content-type'] || getMimeType(format);
        const blob = new Blob([response.data], { type: contentType });
        downloadBlob(blob, `${filename}.${format}`);
      }

      onExportComplete?.(format);
    } catch (error) {
      console.error('Export failed:', error);
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getMimeType = (format: ExportFormat): string => {
    const types: Record<ExportFormat, string> = {
      json: 'application/json',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
    };
    return types[format];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          {isExporting ? `Exporting ${FORMAT_LABELS[exportingFormat!]}...` : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => {
          const Icon = FORMAT_ICONS[format];
          return (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting}
            >
              <Icon className="w-4 h-4 mr-2" />
              {FORMAT_LABELS[format]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Quick export button for single format
export function QuickExportButton({
  endpoint,
  params = {},
  filename = 'export',
  format = 'xlsx',
  label,
  size = 'sm',
}: {
  endpoint: string;
  params?: Record<string, any>;
  filename?: string;
  format?: ExportFormat;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.get(endpoint, {
        params: { ...params, format },
        responseType: format === 'json' ? 'json' : 'blob',
      });

      const blob = format === 'json'
        ? new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        : new Blob([response.data]);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const Icon = FORMAT_ICONS[format];

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : (
        <Icon className="w-4 h-4 mr-1" />
      )}
      {label || `Export ${FORMAT_LABELS[format]}`}
    </Button>
  );
}
