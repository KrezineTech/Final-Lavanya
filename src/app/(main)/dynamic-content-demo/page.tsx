"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import HeroSlider from '@/components/frontend/HeroSlider';
import VideoShowcase from '@/components/frontend/VideoShowcase';
import MeetTheArtist from '@/components/frontend/MeetTheArtist';
import CustomPaintingSection from '@/components/frontend/CustomPaintingSection';
import PageHeader from '@/components/frontend/PageHeader';
import AboutContent from '@/components/frontend/AboutContent';

export default function DynamicContentDemo() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Dynamic Content Demo</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          This page demonstrates all the dynamic content components that can be managed 
          through the admin panel. Each section below fetches content from the database 
          and renders it dynamically.
        </p>
      </div>

      <Separator />

      {/* Home Page Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Home Page - Hero Slider</CardTitle>
        </CardHeader>
        <CardContent>
          <HeroSlider />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Home Page - Video Showcase</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoShowcase />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Home Page - Meet the Artist</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetTheArtist />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Home Page - Custom Painting Section</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomPaintingSection />
        </CardContent>
      </Card>

      <Separator />

      {/* About Page Sections */}
      <Card>
        <CardHeader>
          <CardTitle>About Page - Header</CardTitle>
        </CardHeader>
        <CardContent>
          <PageHeader 
            section="ABOUT_PAGE_HEADER" 
            defaultTitle="About Us"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Page - Content</CardTitle>
        </CardHeader>
        <CardContent>
          <AboutContent />
        </CardContent>
      </Card>

      <Separator />

      {/* Shared Page Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reviews Page Header</CardTitle>
          </CardHeader>
          <CardContent>
            <PageHeader 
              section="SHARED_REVIEWS_HEADER" 
              defaultTitle="What Our Customers Say"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blog Page Header</CardTitle>
          </CardHeader>
          <CardContent>
            <PageHeader 
              section="SHARED_BLOG_HEADER" 
              defaultTitle="Art Stories"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FAQ Page Header</CardTitle>
          </CardHeader>
          <CardContent>
            <PageHeader 
              section="SHARED_FAQ_HEADER" 
              defaultTitle="FAQs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Page Header</CardTitle>
          </CardHeader>
          <CardContent>
            <PageHeader 
              section="SHARED_CONTACT_HEADER" 
              defaultTitle="Contact Us"
            />
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          How to Use These Components
        </h3>
        <div className="text-blue-800 space-y-2">
          <p>
            1. Go to the <strong>Dynamic Pages</strong> section in the admin panel
          </p>
          <p>
            2. Create or edit content for any of the sections shown above
          </p>
          <p>
            3. Upload images/videos, add text content, and save your changes
          </p>
          <p>
            4. The content will automatically appear on your frontend pages
          </p>
          <p>
            5. Use these components in your actual pages by importing them and placing them where needed
          </p>
        </div>
      </div>
    </div>
  );
}
