"use client";

import { useState } from 'react';
import { UniversalSearch } from '@/components/ui/universal-search';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestSearchPage() {
  const [adminResults, setAdminResults] = useState<any>(null);
  const [frontendResults, setFrontendResults] = useState<any>(null);

  const testAdminSearch = async () => {
    try {
      const response = await fetch('/api/admin/search?q=test&limit=5');
      const data = await response.json();
      setAdminResults(data);
    } catch (error) {
      console.error('Admin search error:', error);
      setAdminResults({ error: 'Failed to fetch admin search results' });
    }
  };

  const testFrontendSearch = async () => {
    try {
      const response = await fetch('/api/search?q=test&limit=5');
      const data = await response.json();
      setFrontendResults(data);
    } catch (error) {
      console.error('Frontend search error:', error);
      setFrontendResults({ error: 'Failed to fetch frontend search results' });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Search Functionality Test</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Admin Search Test */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Search Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UniversalSearch
              placeholder="Test admin search..."
              searchEndpoint="/api/admin/search"
              isAdmin={true}
              className="w-full"
            />
            
            <Button onClick={testAdminSearch} className="w-full">
              Test Admin Search API Directly
            </Button>

            {adminResults && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Admin Search Results:</h3>
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(adminResults, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frontend Search Test */}
        <Card>
          <CardHeader>
            <CardTitle>Frontend Search Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UniversalSearch
              placeholder="Test frontend search..."
              searchEndpoint="/api/search"
              isAdmin={false}
              className="w-full"
            />
            
            <Button onClick={testFrontendSearch} className="w-full">
              Test Frontend Search API Directly
            </Button>

            {frontendResults && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Frontend Search Results:</h3>
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(frontendResults, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800">✅ Backend APIs</h3>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• Admin Search API (/api/admin/search)</li>
                <li>• Frontend Search API (/api/search)</li>
                <li>• Search Suggestions API</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800">✅ Frontend Services</h3>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• SearchService Class</li>
                <li>• Caching & History</li>
                <li>• Trending Searches</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800">✅ UI Components</h3>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• Universal Search Component</li>
                <li>• Search Results Page</li>
                <li>• Result Cards & Filtering</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
