import type { DynamicPageData, DynamicPageSection, CreateDynamicPageData, UpdateDynamicPageData } from '@/lib/types';
import React from 'react';

const API_BASE = '/api/dynamic-pages';

export class DynamicPagesService {
  
  /**
   * Get all dynamic pages or filter by section
   */
  static async getAll(section?: DynamicPageSection): Promise<DynamicPageData[]> {
    const url = section ? `${API_BASE}?section=${section}` : API_BASE;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dynamic pages: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get a specific dynamic page by ID
   */
  static async getById(id: string): Promise<DynamicPageData> {
    const response = await fetch(`${API_BASE}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Dynamic page not found');
      }
      throw new Error(`Failed to fetch dynamic page: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get the first active page for a specific section
   */
  static async getBySection(section: DynamicPageSection): Promise<DynamicPageData | null> {
    const pages = await this.getAll(section);
    const activePage = pages.find(page => page.isActive && page.section === section);
    return activePage || null;
  }

  /**
   * Create a new dynamic page
   */
  static async create(data: CreateDynamicPageData): Promise<DynamicPageData> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create dynamic page: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Update an existing dynamic page
   */
  static async update(id: string, data: UpdateDynamicPageData): Promise<DynamicPageData> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Dynamic page not found');
      }
      throw new Error(`Failed to update dynamic page: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Delete a dynamic page
   */
  static async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Dynamic page not found');
      }
      throw new Error(`Failed to delete dynamic page: ${response.statusText}`);
    }
  }

  /**
   * Toggle active status of a dynamic page
   */
  static async toggleActive(id: string, isActive: boolean): Promise<DynamicPageData> {
    return this.update(id, { isActive });
  }

  /**
   * Update sort order of a dynamic page
   */
  static async updateSortOrder(id: string, sortOrder: number): Promise<DynamicPageData> {
    return this.update(id, { sortOrder });
  }
}

// Utility hooks for common use cases
export const useDynamicPageContent = (section: DynamicPageSection) => {
  const [content, setContent] = React.useState<DynamicPageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const data = await DynamicPagesService.getBySection(section);
        setContent(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [section]);

  return { content, loading, error, refetch: () => setLoading(true) };
};
