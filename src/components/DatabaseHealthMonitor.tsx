import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface HealthCheck {
  status: 'healthy' | 'issues_found' | 'error';
  [key: string]: any;
}

interface HealthReport {
  timestamp: string;
  overall: 'healthy' | 'issues_found' | 'error';
  checks: {
    duplicateCategories: HealthCheck;
    orphanedProducts: HealthCheck;
    categoryNameConsistency: HealthCheck;
    databaseConstraints: HealthCheck;
    collectionIntegrity: HealthCheck;
  };
}

export default function DatabaseHealthMonitor() {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchHealthReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/health-check');
      if (!response.ok) throw new Error('Failed to fetch health report');
      const data = await response.json();
      setHealthReport(data);
      setLastChecked(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching health report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthReport();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'issues_found':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'healthy' ? 'default' : status === 'issues_found' ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (!healthReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Database Health Monitor
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchHealthReport}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Checking...' : 'Check Health'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Click "Check Health" to run database health diagnostics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Database Health Monitor
              {getStatusIcon(healthReport.overall)}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchHealthReport}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">Overall Status</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                {getStatusBadge(healthReport.overall)}
              </p>
            </div>
            {lastChecked && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last Checked</p>
                <p className="text-sm">{new Date(lastChecked).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Duplicate Categories Check */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Duplicate Categories
              {getStatusIcon(healthReport.checks.duplicateCategories.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthReport.checks.duplicateCategories.duplicateCount > 0 ? (
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {healthReport.checks.duplicateCategories.duplicateCount}
                </p>
                <p className="text-sm text-muted-foreground">duplicates found</p>
                {healthReport.checks.duplicateCategories.recommendation && (
                  <p className="text-xs text-yellow-600 mt-2">
                    {healthReport.checks.duplicateCategories.recommendation}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-green-600">0</p>
                <p className="text-sm text-muted-foreground">All categories unique</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orphaned Products Check */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Orphaned Products
              {getStatusIcon(healthReport.checks.orphanedProducts.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-2xl font-bold">
                {healthReport.checks.orphanedProducts.orphanedCount || 0}
              </p>
              <p className="text-sm text-muted-foreground">orphaned products</p>
            </div>
          </CardContent>
        </Card>

        {/* Category Name Consistency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Name Consistency
              {getStatusIcon(healthReport.checks.categoryNameConsistency.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-2xl font-bold">
                {healthReport.checks.categoryNameConsistency.issuesCount || 0}
              </p>
              <p className="text-sm text-muted-foreground">naming issues</p>
            </div>
          </CardContent>
        </Card>

        {/* Database Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Database Stats
              {getStatusIcon(healthReport.checks.databaseConstraints.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">Categories:</span>
                <span className="font-medium">
                  {healthReport.checks.databaseConstraints.stats?.totalCategories || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Products:</span>
                <span className="font-medium">
                  {healthReport.checks.databaseConstraints.stats?.totalProducts || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Integrity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Collection Integrity
              {getStatusIcon(healthReport.checks.collectionIntegrity.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-2xl font-bold">
                {healthReport.checks.collectionIntegrity.duplicateCollectionCount || 0}
              </p>
              <p className="text-sm text-muted-foreground">duplicate collections</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {healthReport.overall !== 'healthy' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthReport.checks.duplicateCategories.status === 'issues_found' && (
                <p className="text-sm text-yellow-600">
                  • Run the auto-fix script: <code>npm run auto-fix</code>
                </p>
              )}
              {healthReport.checks.orphanedProducts.status === 'issues_found' && (
                <p className="text-sm text-yellow-600">
                  • Fix orphaned products by running the health check script
                </p>
              )}
              {healthReport.checks.categoryNameConsistency.status === 'issues_found' && (
                <p className="text-sm text-yellow-600">
                  • Clean up category names with whitespace issues
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
