import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, FileText, Download, Upload, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CSVError {
  row: number;
  column?: string;
  field?: string;
  value?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface CSVValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: CSVError[];
  warnings: CSVError[];
  preview: any[];
  fieldMapping: Record<string, string>;
  suggestions: {
    duplicateSkus: string[];
    missingRequiredFields: string[];
    formatIssues: string[];
  };
}

interface CSVValidationReportProps {
  validationResult: CSVValidationResult | null;
  isValidating: boolean;
  onRetry: () => void;
  onProceed: () => void;
  onCancel: () => void;
  showPreview?: boolean;
}

const ErrorSeverityIcon = ({ severity }: { severity: CSVError['severity'] }) => {
  switch (severity) {
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
};

const ErrorItem = ({ error }: { error: CSVError }) => (
  <div className="flex items-start gap-3 p-3 border rounded-lg">
    <ErrorSeverityIcon severity={error.severity} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">Row {error.row}</span>
        {error.field && (
          <Badge variant="outline" className="text-xs">
            {error.field}
          </Badge>
        )}
        {error.column && (
          <Badge variant="secondary" className="text-xs">
            Column: {error.column}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{error.message}</p>
      {error.value && (
        <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Value: "{error.value}"
        </p>
      )}
    </div>
  </div>
);

const FieldMappingPreview = ({ mapping }: { mapping: Record<string, string> }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Field Mapping Preview</CardTitle>
      <CardDescription>
        How CSV columns will be mapped to product fields
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {Object.entries(mapping).map(([csvField, productField]) => (
          <div key={csvField} className="flex justify-between p-2 bg-muted rounded">
            <span className="font-mono text-blue-600">{csvField}</span>
            <span>→</span>
            <span className="font-medium">{productField}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const PreviewTable = ({ preview }: { preview: any[] }) => {
  const headers = preview.length > 0 ? Object.keys(preview[0]) : [];
  const displayRows = preview.slice(0, 5); // Show first 5 rows

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Data Preview</CardTitle>
        <CardDescription>
          First {displayRows.length} rows of your CSV data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 w-full">
          <div className="min-w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {headers.map(header => (
                    <th key={header} className="text-left p-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, index) => (
                  <tr key={index} className="border-b">
                    {headers.map(header => (
                      <td key={header} className="p-2 max-w-[150px] truncate">
                        {String(row[header] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const ValidationSummary = ({ result }: { result: CSVValidationResult }) => {
  const successRate = (result.validRows / result.totalRows) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {result.validRows}
            </div>
            <div className="text-sm text-muted-foreground">Valid Rows</div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">
              {result.errors.length}
            </div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {result.warnings.length}
            </div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-3">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span className="font-medium">{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SmartSuggestions = ({ suggestions }: { suggestions: CSVValidationResult['suggestions'] }) => {
  const hasSuggestions = 
    suggestions.duplicateSkus.length > 0 ||
    suggestions.missingRequiredFields.length > 0 ||
    suggestions.formatIssues.length > 0;

  if (!hasSuggestions) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Smart Suggestions
        </CardTitle>
        <CardDescription>
          Recommendations to improve your data quality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.duplicateSkus.length > 0 && (
          <Alert>
            <AlertDescription>
              <strong>Duplicate SKUs found:</strong> {suggestions.duplicateSkus.join(', ')}
              <br />
              Consider updating these SKUs to be unique across all products.
            </AlertDescription>
          </Alert>
        )}
        
        {suggestions.missingRequiredFields.length > 0 && (
          <Alert>
            <AlertDescription>
              <strong>Missing required fields:</strong> {suggestions.missingRequiredFields.join(', ')}
              <br />
              These fields are required for a complete product listing.
            </AlertDescription>
          </Alert>
        )}
        
        {suggestions.formatIssues.length > 0 && (
          <Alert>
            <AlertDescription>
              <strong>Format issues detected:</strong>
              <ul className="list-disc list-inside mt-2">
                {suggestions.formatIssues.map((issue, index) => (
                  <li key={index} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const CSVValidationReport: React.FC<CSVValidationReportProps> = ({
  validationResult,
  isValidating,
  onRetry,
  onProceed,
  onCancel,
  showPreview = true,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'summary' | 'errors' | 'warnings' | 'preview'>('summary');

  const downloadErrorReport = () => {
    if (!validationResult) return;

    const allIssues = [...validationResult.errors, ...validationResult.warnings];
    const csvContent = [
      ['Row', 'Field', 'Column', 'Severity', 'Message', 'Value'],
      ...allIssues.map(issue => [
        issue.row.toString(),
        issue.field || '',
        issue.column || '',
        issue.severity,
        issue.message,
        issue.value || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csv-validation-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "CSV validation report has been downloaded.",
    });
  };

  if (isValidating) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-medium mb-2">Validating CSV Data</h3>
          <p className="text-muted-foreground">
            Please wait while we analyze your CSV file...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult) {
    return null;
  }

  const canProceed = validationResult.errors.length === 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">CSV Validation Report</h2>
          <p className="text-muted-foreground">
            Review the validation results before importing your data
          </p>
        </div>
        <div className="flex gap-2">
          {validationResult.errors.length > 0 && (
            <Button variant="outline" onClick={downloadErrorReport} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
          <Button variant="outline" onClick={onRetry} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Try Different File
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      <ValidationSummary result={validationResult} />

      {/* Smart Suggestions */}
      <SmartSuggestions suggestions={validationResult.suggestions} />

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'summary', label: 'Summary', count: null },
            { id: 'errors', label: 'Errors', count: validationResult.errors.length },
            { id: 'warnings', label: 'Warnings', count: validationResult.warnings.length },
            ...(showPreview ? [{ id: 'preview', label: 'Preview', count: null }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <FieldMappingPreview mapping={validationResult.fieldMapping} />
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="space-y-4">
            {validationResult.errors.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-700">No Errors Found!</h3>
                <p className="text-muted-foreground">Your CSV data passed all validation checks.</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {validationResult.errors.map((error, index) => (
                    <ErrorItem key={index} error={error} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {activeTab === 'warnings' && (
          <div className="space-y-4">
            {validationResult.warnings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-700">No Warnings</h3>
                <p className="text-muted-foreground">Your data looks great!</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {validationResult.warnings.map((warning, index) => (
                    <ErrorItem key={index} error={warning} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {activeTab === 'preview' && showPreview && (
          <PreviewTable preview={validationResult.preview} />
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {!canProceed && (
            <Alert className="max-w-md">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix all errors before proceeding with the import.
              </AlertDescription>
            </Alert>
          )}
          {canProceed && validationResult.warnings.length > 0 && (
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Warnings detected. Review them carefully before importing.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onProceed} 
            disabled={!canProceed}
            className={cn(
              !canProceed && "opacity-50 cursor-not-allowed"
            )}
          >
            {canProceed ? "Import Data" : "Fix Errors First"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CSVValidationReport;
