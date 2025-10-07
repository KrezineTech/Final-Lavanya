/**
 * Performance monitoring utilities for the listings system
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeMetrics = new Map<string, PerformanceMetric>();

  start(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };
    
    this.activeMetrics.set(name, metric);
  }

  end(name: string): number | null {
    const metric = this.activeMetrics.get(name);
    if (!metric) {
      console.warn(`No active metric found for: ${name}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    this.metrics.push(metric);
    this.activeMetrics.delete(name);

    // Log slow operations
    if (metric.duration > 1000) { // > 1 second
      console.warn(`Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`, metric.metadata);
    }

    return metric.duration;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }

  clear(): void {
    this.metrics = [];
    this.activeMetrics.clear();
  }

  // Helper for API call monitoring
  async monitorAPICall<T>(
    name: string, 
    apiCall: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await apiCall();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      console.error(`API call failed: ${name}`, error, metadata);
      throw error;
    }
  }

  // Log a completed query operation
  logQuery(operation: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name: `query:${operation}`,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: metadata?.responseTime || 0,
      metadata: { operation, ...metadata }
    };
    
    this.metrics.push(metric);

    // Log slow operations
    if (metric.duration && metric.duration > 1000) {
      console.warn(`Slow query detected: ${operation} took ${metric.duration.toFixed(2)}ms`, metadata);
    }
  }

  // Helper for component render monitoring
  monitorRender(componentName: string): () => void {
    this.start(`render:${componentName}`);
    return () => this.end(`render:${componentName}`);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Development-only performance logging
if (process.env.NODE_ENV === 'development') {
  // Log performance summary every 30 seconds
  setInterval(() => {
    const metrics = performanceMonitor.getMetrics();
    if (metrics.length > 0) {
      console.group('📊 Performance Summary');
      
      // Group by operation type
      const groupedMetrics = metrics.reduce((acc, metric) => {
        const key = metric.name.split(':')[0]; // Get operation type
        if (!acc[key]) acc[key] = [];
        acc[key].push(metric);
        return acc;
      }, {} as Record<string, PerformanceMetric[]>);

      Object.entries(groupedMetrics).forEach(([type, typeMetrics]) => {
        const avg = typeMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / typeMetrics.length;
        const slowCount = typeMetrics.filter(m => (m.duration || 0) > 1000).length;
        
        console.log(`${type}: ${typeMetrics.length} calls, ${avg.toFixed(2)}ms avg${slowCount > 0 ? `, ${slowCount} slow` : ''}`);
      });
      
      console.groupEnd();
      performanceMonitor.clear(); // Clear after reporting
    }
  }, 30000);
}

// React hook for component performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const monitor = performanceMonitor.monitorRender(componentName);
  
  // Return cleanup function
  return monitor;
}
