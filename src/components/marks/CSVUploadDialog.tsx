import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  subQuestions: Array<{ id: string; label: string; maxMarks: number }>;
  onUploadComplete: () => void;
}

export function CSVUploadDialog({ open, onOpenChange, examId, subQuestions, onUploadComplete }: CSVUploadDialogProps) {
  const [csvData, setCSVData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/marks/${examId}/csv-template`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `marks_template_${examId.substring(0, 8)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrors(['Failed to download template']);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 3) {
          setErrors(['CSV must have at least headers, max marks, and one student row']);
          return;
        }

        const fileHeaders = rows[0];
        
        // Filter out completely empty rows
        const dataRows = rows.slice(2).filter(row => {
          // Row is not empty if it has at least a roll number
          return row[0] && row[0].trim() !== '';
        });

        if (dataRows.length === 0) {
          setErrors(['No student data found in CSV']);
          return;
        }

        setHeaders(fileHeaders);
        setCSVData(dataRows);
        validateCSV(fileHeaders, dataRows);
      },
      error: (error) => {
        setErrors([`Error parsing CSV: ${error.message}`]);
      }
    });
  };

  const validateCSV = (fileHeaders: string[], dataRows: string[][]) => {
    const validationErrors: string[] = [];

    // Check headers match expected structure
    if (fileHeaders[0] !== 'Roll Number' || fileHeaders[1] !== 'Student Name') {
      validationErrors.push('First two columns must be "Roll Number" and "Student Name"');
    }

    // Check each data row
    dataRows.forEach((row, idx) => {
      // Skip empty rows
      if (!row[0] || row[0].trim() === '') {
        return;
      }

      // Check marks values
      for (let i = 2; i < row.length; i++) {
        const marksValue = row[i]?.trim();
        if (marksValue && marksValue !== '') {
          const marks = parseFloat(marksValue);
          if (isNaN(marks)) {
            validationErrors.push(`Row ${idx + 3}, Column ${fileHeaders[i]}: Invalid number "${marksValue}"`);
          } else if (marks < 0) {
            validationErrors.push(`Row ${idx + 3}, Column ${fileHeaders[i]}: Negative marks not allowed`);
          }
        }
      }
    });

    setErrors(validationErrors);
  };

  const handleUpload = async () => {
    if (csvData.length === 0 || errors.length > 0) return;

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Map CSV data to API format
      const marks = csvData.map(row => {
        const rollNumber = row[0];
        const subQuestionMarks = subQuestions.map((sq, idx) => {
          const marksValue = row[idx + 2]; // +2 to skip Roll Number and Student Name columns
          return {
            subQuestionId: sq.id,
            marks: marksValue && marksValue.trim() !== '' ? parseFloat(marksValue) : 0
          };
        });

       console.log('[CSV UPLOAD] Student:', rollNumber, 'Marks:', subQuestionMarks.length);
        return { rollNumber, subQuestionMarks };
      });

      console.log('[CSV UPLOAD] Sending data:');
      console.log('  Students:', marks.length);
      console.log('  Sub-questions per student:', subQuestions.length);
      console.log('  First student sample:', marks[0]);

      const response = await api.post(`/marks/${examId}/bulk-upload`, { marks });

      console.log('[CSV UPLOAD] Response:', response.data);

      setUploadSuccess(true);
      setErrors([]);
      
      // Force refetch marks (bypass cache)
      console.log('[CSV UPLOAD] Forcing refetch for exam:', examId);
      await queryClient.refetchQueries({ 
        queryKey: ['student-marks', examId],
        type: 'active'
      });
      
      console.log('[CSV UPLOAD] Refetch complete, closing dialog...');
      
      setTimeout(() => {
        onUploadComplete();
        onOpenChange(false);
        resetDialog();
      }, 1000);

    } catch (error: any) {
      console.error('[CSV UPLOAD] Error:', error);
      const apiErrors = error.response?.data?.errors || [error.response?.data?.message || 'Upload failed'];
      setErrors(apiErrors);
    } finally {
      setIsUploading(false);
    }
  };

  const resetDialog = () => {
    setCSVData([]);
    setHeaders([]);
    setErrors([]);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Marks (CSV)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Choose CSV File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Validation Errors:</div>
                <ul className="list-disc list-inside text-sm">
                  {errors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {errors.length > 10 && <li>...and {errors.length - 10} more errors</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {uploadSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Marks uploaded successfully! {csvData.length} students processed.
              </AlertDescription>
            </Alert>
          )}

          {csvData.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header, idx) => (
                      <TableHead key={idx} className="whitespace-nowrap">{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      {row.map((cell: string, cellIdx: number) => (
                        <TableCell key={cellIdx} className="whitespace-nowrap">{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {csvData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={headers.length} className="text-center text-muted-foreground">
                        ...and {csvData.length - 10} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={csvData.length === 0 || errors.length > 0 || isUploading || uploadSuccess}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {csvData.length} Students
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
