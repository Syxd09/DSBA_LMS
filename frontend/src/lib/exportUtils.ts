/**
 * PDF Export Utilities
 * Handles downloading PDF reports from the templates API
 */

/**
 * Download a file blob as a named file
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateReportFilename(
    reportType: string,
    entityName: string,
    format: 'pdf' | 'xlsx' = 'pdf'
): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = entityName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${reportType}_${sanitizedName}_${timestamp}.${format}`;
}

/**
 * Report types with their display names
 */
export const REPORT_TYPES = {
    CO_ATTAINMENT: { key: 'co-attainment', name: 'CO Attainment Report' },
    PO_MATRIX: { key: 'po-matrix', name: 'PO Matrix Report' },
    PSO_MATRIX: { key: 'pso-matrix', name: 'PSO Matrix Report' },
    STUDENT_PERFORMANCE: { key: 'student-performance', name: 'Student Performance Report' },
    NAAC_CRITERION_2: { key: 'naac-criterion-2', name: 'NAAC Criterion-2 Report' },
    NAAC_CRITERION_3: { key: 'naac-criterion-3', name: 'NAAC Criterion-3 Report' },
    GAP_ANALYSIS: { key: 'gap-analysis', name: 'Gap Analysis Report' },
    SUBJECT_SUMMARY: { key: 'subject-summary', name: 'Subject Summary Report' },
} as const;

/**
 * Handle API response for file download
 */
export async function handleFileDownload(
    apiCall: () => Promise<Blob>,
    filename: string,
    onSuccess?: () => void,
    onError?: (error: Error) => void
): Promise<void> {
    try {
        const blob = await apiCall();
        downloadBlob(blob, filename);
        onSuccess?.();
    } catch (error) {
        console.error('Download failed:', error);
        onError?.(error as Error);
    }
}
