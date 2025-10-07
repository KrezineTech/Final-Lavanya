
/**
 * Profile Page
 * - Requires authentication
 * - Dynamic profile display based on session
 * - Super Admin user management
 */

"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Save, Shield, User, Mail, Phone, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserManagementPanel } from '@/components/UserManagementPanel';

// Client-side date component to avoid hydration mismatch
function ClientSideDate() {
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    // Only set the date on the client side
    setDate(new Date().toLocaleString());
  }, []);

  return (
    <p className="text-sm text-muted-foreground">
      {date || 'Loading...'}
    </p>
  );
}

interface ProfileData {
  name: string;
  email: string;
  contactNumber?: string;
  avatar?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    contactNumber: '',
    avatar: ''
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Initialize profile data from session
    setProfileData({
      name: session.user.name || '',
      email: session.user.email || '',
      contactNumber: '',
      avatar: session.user.image || ''
    });
  }, [session, status, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file.",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAvatarPreview(null);
    const fileInput = document.getElementById('avatarUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // TODO: Implement actual profile update API call
      // For now, just simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully saved.",
      });

    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleIcon = (role: string) => {
    return <Shield className="h-4 w-4" />;
  };

  const getRoleBadgeVariant = (role: string) => {
    return 'default';
  };

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!session?.user) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Badge variant="default">
          {session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
        </Badge>
      </div>

      {/* Tabs for Profile and User Management */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {(session.user.canManageUsers || session.user.role === 'SUPER_ADMIN') && (
            <TabsTrigger value="users">User Management</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="relative">
                  {avatarPreview || session.user.image ? (
                    <Image
                      src={avatarPreview || session.user.image || ''}
                      alt="Profile"
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{session.user.name || 'Admin User'}</h3>
                  <p className="text-muted-foreground">{session.user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Active since {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Upload Section */}
                <div>
                  <Label className="text-base font-semibold">Profile Picture</Label>
                  <div className="mt-2 space-y-4">
                    <label
                      htmlFor="avatarUpload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, WEBP up to 5MB
                        </p>
                      </div>
                      <Input
                        id="avatarUpload"
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/webp,image/png"
                        onChange={handleImageChange}
                      />
                    </label>

                    {avatarPreview && (
                      <div className="relative w-24 h-24">
                        <Image
                          src={avatarPreview}
                          alt="Avatar Preview"
                          width={96}
                          height={96}
                          className="rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={profileData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email (Read-only)
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed for security reasons
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Number (Optional)
                    </Label>
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      value={profileData.contactNumber}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Current Role
                    </Label>
                    <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                      <Shield className="h-4 w-4 mr-2" />
                      <span>{session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contact an administrator to change your role
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="min-w-32"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Profile
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Account Status</p>
                    <p className="text-sm text-muted-foreground">Your account is active and secure</p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Last Login</p>
                    <ClientSideDate />
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Session Security</p>
                    <p className="text-sm text-muted-foreground">
                      Your session is encrypted and secure
                    </p>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    Encrypted
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        {(session.user.canManageUsers || session.user.role === 'SUPER_ADMIN') && (
          <TabsContent value="users">
            <UserManagementPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
