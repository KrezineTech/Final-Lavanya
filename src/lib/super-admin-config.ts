/**
 * Super Admin Configuration
 * 
 * This file contains the Super Admin credentials and page access configuration.
 * The Super Admin is the only user who can log in initially and create other users.
 */

import bcrypt from 'bcryptjs';

// Super Admin Credentials - Update these values to your desired credentials
export const SUPER_ADMIN = {
  email: 'sample@gmail.com',
  password: 'Sample@07', // This will be hashed during authentication
  name: 'Super Administrator',
  role: 'SUPER_ADMIN' as const
};

// Available pages in the admin system
export const AVAILABLE_PAGES = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/orders', label: 'Orders', icon: 'ShoppingCart' },
  { path: '/products', label: 'Products', icon: 'Package' },
  { path: '/listings', label: 'Listings', icon: 'List' },
  { path: '/message', label: 'Messages', icon: 'MessageSquare' },
  { path: '/discounts', label: 'Discounts', icon: 'Tag' },
  { path: '/content', label: 'Content', icon: 'FileText' },
  { path: '/dynamic-pages', label: 'Dynamic Pages', icon: 'Layout' },
  { path: '/customers', label: 'Customers', icon: 'Users' },
  { path: '/reviews', label: 'Reviews', icon: 'Star' },
  { path: '/analytics', label: 'Analytics', icon: 'BarChart' },
  { path: '/blogs', label: 'Blogs', icon: 'BookOpen' },
  { path: '/pages', label: 'Pages', icon: 'File' },
  { path: '/support', label: 'Support', icon: 'HelpCircle' },
  { path: '/profile', label: 'Profile', icon: 'User' }
] as const;

// Default pages that all users should have access to
export const DEFAULT_USER_PAGES = [
  '/profile'
];

// Helper function to hash password for comparison
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Helper function to check if credentials match Super Admin
export async function isSuperAdminCredentials(email: string, password: string): Promise<boolean> {
  if (email.toLowerCase() !== SUPER_ADMIN.email.toLowerCase()) {
    return false;
  }
  
  // Direct password comparison for Super Admin (we'll hash it during login)
  return password === SUPER_ADMIN.password;
}

// Helper function to get Super Admin data
export function getSuperAdminData() {
  return {
    email: SUPER_ADMIN.email,
    name: SUPER_ADMIN.name,
    role: SUPER_ADMIN.role,
    allowedPages: AVAILABLE_PAGES.map(p => p.path),
    canManageUsers: true,
    isActive: true
  };
}
