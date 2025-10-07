"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, Upload, Image as ImageIcon, Video, FileText, Save, Eye } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import FileUpload from '@/components/FileUpload';
import type { DynamicPageData, DynamicPageSection, CreateDynamicPageData, UpdateDynamicPageData } from '@/lib/types';

// Extended form data interface for FAQ support
interface ExtendedFormData extends Partial<CreateDynamicPageData> {
  questions?: string[];
  answers?: string[];
  // Enhanced FAQ group fields
  groupTitle?: string;
  isVisible?: boolean;
  order?: number;
  faqData?: {
    groups?: {
      groupTitle: string;
      isVisible: boolean;
      order: number;
      questions: { question: string; answer: string }[];
    }[];
  };
}

// Section configuration interface
interface SectionConfig {
  label: string;
  group: string;
  fields: string[];
  description: string;
  icon: React.ComponentType<any>;
  isSlider?: boolean;
  maxItems?: number;
  isFaq?: boolean;
  isMetaDataArray?: boolean;
}

// Extended section configuration with grouping
const SECTION_CONFIG: Record<string, SectionConfig> = {
  'HOME_HERO_SLIDER': {
    label: 'Hero Slider',
    group: 'Home Page',
    fields: ['desktopImage', 'mobileImage', 'title', 'subtitle', 'buttonText'],
    description: 'Main banner slider - Add multiple slides with different images and text for each slide',
    icon: ImageIcon,
    isSlider: true,
    maxItems: 5
  },
  'HOME_VIDEO_SHOWCASE': {
    label: 'Video Showcase',
    group: 'Home Page',
    fields: ['videoSource', 'title', 'description'],
    description: 'Featured video content with title and description',
    icon: Video
  },
  'HOME_MEET_ARTIST': {
    label: 'Meet the Artist',
    group: 'Home Page',
    fields: ['image', 'title', 'paragraph1', 'paragraph2'],
    description: 'Artist introduction section with image and text',
    icon: FileText
  },
  'HOME_CUSTOM_PAINTING_SECTION': {
    label: 'Custom Painting Section',
    group: 'Home Page',
    fields: ['videoSource', 'title', 'subtitle'],
    description: 'Custom painting services showcase',
    icon: Video
  },
  'HOME_INDIAN_ART_SECTION': {
    label: 'Indian Art Section',
    group: 'Home Page',
    fields: ['title', 'description', 'metaData'],
    description: 'Indian art categories showcase - Add category items with images and names',
    icon: ImageIcon,
    isMetaDataArray: true,
    maxItems: 10
  },
  'HOME_SUBCATEGORY_SLIDER': {
    label: 'Subcategory Slider',
    group: 'Home Page',
    fields: ['title', 'description', 'metaData'],
    description: 'Art style subcategories slider - Add style items with images and names',
    icon: ImageIcon,
    isMetaDataArray: true,
    maxItems: 15
  },
  'HOME_OUR_STANDARDS': {
    label: 'Our Standards',
    group: 'Home Page',
    fields: ['title', 'description', 'metaData'],
    description: 'Company standards and values - Add standard items with icons, titles and descriptions',
    icon: FileText,
    isMetaDataArray: true,
    maxItems: 10
  },
  'HOME_TESTIMONIAL_SLIDER': {
    label: 'Testimonial Slider',
    group: 'Home Page',
    fields: ['title', 'description', 'metaData'],
    description: 'Customer testimonials showcase - Add testimonial items with images and sources',
    icon: ImageIcon,
    isMetaDataArray: true,
    maxItems: 20
  },
  'ABOUT_PAGE_HEADER': {
    label: 'Page Header',
    group: 'About Page',
    fields: ['desktopImage', 'mobileImage', 'title'],
    description: 'About page header with responsive images',
    icon: ImageIcon
  },
  'ABOUT_CONTENT': {
    label: 'Content Section',
    group: 'About Page',
    fields: ['designerImage', 'designerQuote', 'bannerImage', 'interiorImage', 'paragraphTexts'],
    description: 'Main about content with images and text blocks',
    icon: FileText
  },
  'SHARED_REVIEWS_HEADER': {
    label: 'Reviews Header',
    group: 'Shared Headers',
    fields: ['image', 'title'],
    description: 'Reviews page header section',
    icon: ImageIcon
  },
  'SHARED_BLOG_HEADER': {
    label: 'Blog Header',
    group: 'Shared Headers',
    fields: ['image', 'title'],
    description: 'Blog page header section',
    icon: ImageIcon
  },
  'SHARED_FAQ_HEADER': {
    label: 'FAQ Group Management',
    group: 'FAQ System',
    fields: ['groupTitle', 'isVisible', 'order', 'faqItems'],
    description: 'Manage FAQ groups with titles, visibility controls, ordering, and multiple questions/answers',
    icon: FileText,
    isFaq: true,
    maxItems: 50
  },
  'SHARED_CONTACT_HEADER': {
    label: 'Contact Header',
    group: 'Shared Headers',
    fields: ['image', 'title'],
    description: 'Contact page header section',
    icon: ImageIcon
  },
  'SHARED_CHECKOUT_HEADER': {
    label: 'Checkout Header',
    group: 'Shared Headers',
    fields: ['image', 'title'],
    description: 'Checkout page header section',
    icon: ImageIcon
  }
} as const;

// Group sections by their group
const SECTION_GROUPS = Object.entries(SECTION_CONFIG).reduce((acc, [key, config]) => {
  const group = config.group;
  if (!acc[group]) {
    acc[group] = [];
  }
  acc[group].push({
    key: key as DynamicPageSection,
    ...config
  });
  return acc;
}, {} as Record<string, Array<{key: DynamicPageSection} & typeof SECTION_CONFIG[keyof typeof SECTION_CONFIG]>>);

const SECTION_LABELS: Record<DynamicPageSection, string> = {
  HOME_HERO_SLIDER: 'Home - Hero Slider',
  HOME_VIDEO_SHOWCASE: 'Home - Video Showcase',
  HOME_MEET_ARTIST: 'Home - Meet the Artist',
  HOME_CUSTOM_PAINTING_SECTION: 'Home - Custom Painting Section',
  HOME_INDIAN_ART_SECTION: 'Home - Indian Art Section',
  HOME_SUBCATEGORY_SLIDER: 'Home - Subcategory Slider',
  HOME_OUR_STANDARDS: 'Home - Our Standards',
  HOME_TESTIMONIAL_SLIDER: 'Home - Testimonial Slider',
  ABOUT_PAGE_HEADER: 'About - Page Header',
  ABOUT_CONTENT: 'About - Content',
  SHARED_REVIEWS_HEADER: 'Shared - Reviews Header',
  SHARED_BLOG_HEADER: 'Shared - Blog Header',
  SHARED_FAQ_HEADER: 'Shared - FAQ Header',
  SHARED_CONTACT_HEADER: 'Shared - Contact Header',
  SHARED_CHECKOUT_HEADER: 'Shared - Checkout Header'
};

const SECTION_FIELDS: Record<DynamicPageSection, string[]> = {
  HOME_HERO_SLIDER: ['desktopImage', 'mobileImage', 'title', 'subtitle', 'buttonText'],
  HOME_VIDEO_SHOWCASE: ['videoSource', 'title', 'description'],
  HOME_MEET_ARTIST: ['image', 'title', 'paragraph1', 'paragraph2'],
  HOME_CUSTOM_PAINTING_SECTION: ['videoSource', 'title', 'subtitle'],
  HOME_INDIAN_ART_SECTION: ['title', 'description', 'metaData'],
  HOME_SUBCATEGORY_SLIDER: ['title', 'description', 'metaData'],
  HOME_OUR_STANDARDS: ['title', 'description', 'metaData'],
  HOME_TESTIMONIAL_SLIDER: ['title', 'description', 'metaData'],
  ABOUT_PAGE_HEADER: ['desktopImage', 'mobileImage', 'title'],
  ABOUT_CONTENT: ['designerImage', 'designerQuote', 'bannerImage', 'interiorImage', 'paragraphTexts'],
  SHARED_REVIEWS_HEADER: ['image', 'title'],
  SHARED_BLOG_HEADER: ['image', 'title'],
  SHARED_FAQ_HEADER: ['groupTitle', 'isVisible', 'order', 'faqItems'],
  SHARED_CONTACT_HEADER: ['image', 'title'],
  SHARED_CHECKOUT_HEADER: ['image', 'title']
};

interface DynamicPageFormProps {
  page?: DynamicPageData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateDynamicPageData | UpdateDynamicPageData) => void;
  section?: DynamicPageSection;
}

interface SectionFormProps {
  section: DynamicPageSection;
  pages: DynamicPageData[];
  onSave: (data: CreateDynamicPageData | UpdateDynamicPageData, editingId?: string) => Promise<void>;
  onDelete: (page: DynamicPageData) => Promise<void>;
}

const SectionForm: React.FC<SectionFormProps> = ({ section, pages, onSave, onDelete }) => {
  const [items, setItems] = useState<DynamicPageData[]>([]);
  const [editingItem, setEditingItem] = useState<DynamicPageData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<ExtendedFormData>({});
  const [paragraphTexts, setParagraphTexts] = useState<string[]>(['']);
  const [faqItems, setFaqItems] = useState<{question: string, answer: string}[]>([{question: '', answer: ''}]);
  const [deletingItem, setDeletingItem] = useState<DynamicPageData | null>(null);
  const [previewItem, setPreviewItem] = useState<DynamicPageData | null>(null);
  const { toast } = useToast();

  const sectionConfig = SECTION_CONFIG[section];

  useEffect(() => {
    const sectionPages = pages.filter(page => page.section === section);
    setItems(sectionPages);
  }, [pages, section]);

  useEffect(() => {
    if (editingItem) {
      let formDataToSet: ExtendedFormData = {
        section: editingItem.section,
        title: editingItem.title || '',
        subtitle: editingItem.subtitle || '',
        description: editingItem.description || '',
        buttonText: editingItem.buttonText || '',
        desktopImage: editingItem.desktopImage || '',
        mobileImage: editingItem.mobileImage || '',
        image: editingItem.image || '',
        videoSource: editingItem.videoSource || '',
        paragraph1: editingItem.paragraph1 || '',
        paragraph2: editingItem.paragraph2 || '',
        designerImage: editingItem.designerImage || '',
        designerQuote: editingItem.designerQuote || '',
        bannerImage: editingItem.bannerImage || '',
        interiorImage: editingItem.interiorImage || '',
        isActive: editingItem.isActive,
        sortOrder: editingItem.sortOrder
      };

      // Special handling for FAQ data
      if (sectionConfig.isFaq && editingItem.metaData && typeof editingItem.metaData === 'object') {
        const metaData = editingItem.metaData as any;
        if (metaData.faqData) {
          // Enhanced FAQ group data
          formDataToSet.groupTitle = metaData.faqData.groupTitle || metaData.faqData.title || editingItem.title || '';
          formDataToSet.isVisible = metaData.faqData.isVisible !== undefined ? metaData.faqData.isVisible : editingItem.isActive;
          formDataToSet.order = metaData.faqData.order !== undefined ? metaData.faqData.order : editingItem.sortOrder;
          
          // Handle both old single Q&A format and new multiple items format
          if (metaData.faqData.faqs && Array.isArray(metaData.faqData.faqs)) {
            // New enhanced group format
            setFaqItems(metaData.faqData.faqs);
          } else if (metaData.faqData.items && Array.isArray(metaData.faqData.items)) {
            // Legacy items format
            setFaqItems(metaData.faqData.items);
          } else if (metaData.faqData.question && metaData.faqData.answer) {
            // Legacy single Q&A format
            setFaqItems([{
              question: metaData.faqData.question,
              answer: metaData.faqData.answer
            }]);
          }
        }
      }

      setFormData(formDataToSet);
      
      if (editingItem.paragraphTexts && Array.isArray(editingItem.paragraphTexts)) {
        setParagraphTexts(editingItem.paragraphTexts);
      } else {
        setParagraphTexts(['']);
      }
    } else {
      // Initialize form for new item
      const baseFormData = {
        section,
        isActive: true,
        sortOrder: items.length
      };
      
      // Add FAQ-specific initialization
      if (SECTION_CONFIG[section]?.isFaq) {
        (baseFormData as ExtendedFormData).isVisible = true;
        (baseFormData as ExtendedFormData).order = items.length + 1;
        (baseFormData as ExtendedFormData).faqData = {
          groups: [{
            groupTitle: 'New FAQ Group',
            isVisible: true,
            order: 1,
            questions: []
          }]
        };
      }
      
      setFormData(baseFormData);
      setParagraphTexts(['']);
      setFaqItems([{question: '', answer: ''}]);
    }
  }, [editingItem, section, items.length, sectionConfig.isFaq]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMediaUpload = (field: string, files: any[]) => {
    if (files.length > 0) {
      const file = files[0];
      const mediaUrl = file.filePath || file.url || file.src;
      handleInputChange(field, mediaUrl);
    }
  };

  const addParagraph = () => {
    setParagraphTexts(prev => [...prev, '']);
  };

  const removeParagraph = (index: number) => {
    setParagraphTexts(prev => prev.filter((_, i) => i !== index));
  };

  const updateParagraph = (index: number, value: string) => {
    setParagraphTexts(prev => prev.map((text, i) => i === index ? value : text));
  };

  // FAQ management functions
  const addFaqItem = () => {
    const currentFaqData = (formData as ExtendedFormData).faqData || { groups: [] };
    const newGroup = {
      groupTitle: `FAQ Group ${(currentFaqData.groups?.length || 0) + 1}`,
      isVisible: true,
      order: (currentFaqData.groups?.length || 0) + 1,
      questions: []
    };
    
    const updatedFaqData = {
      ...currentFaqData,
      groups: [...(currentFaqData.groups || []), newGroup]
    };
    
    handleInputChange('faqData', updatedFaqData);
  };

  const removeFaqItem = (index: number) => {
    const currentFaqData = (formData as ExtendedFormData).faqData;
    if (currentFaqData?.groups) {
      const updatedFaqData = {
        ...currentFaqData,
        groups: currentFaqData.groups.filter((_, i) => i !== index)
      };
      handleInputChange('faqData', updatedFaqData);
    }
  };

  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) => {
    setFaqItems(prev => prev.map((item, i) => 
      i === index ? {...item, [field]: value} : item
    ));
  };

  const handleSubmit = async () => {
    try {
      let submitData = {
        ...formData,
        section,
        paragraphTexts: sectionConfig.fields.includes('paragraphTexts') ? paragraphTexts.filter(p => p.trim()) : undefined
      };

      // Special handling for FAQ data
      if (sectionConfig.isFaq) {
        const extFormData = formData as ExtendedFormData;
        
        // Calculate next available sort order for this section
        const existingFaqsInSection = items.filter(item => item.section === section);
        const maxSortOrder = Math.max(0, ...existingFaqsInSection.map(item => item.sortOrder || 0));
        const nextSortOrder = editingItem ? (editingItem.sortOrder || 1) : (maxSortOrder + 1);
        
        if (extFormData.faqData?.groups) {
          // Use enhanced FAQ group structure
          submitData = {
            ...submitData,
            title: extFormData.title || extFormData.groupTitle || 'FAQ Section',
            isActive: extFormData.isVisible !== false,
            sortOrder: nextSortOrder,
            metaData: {
              faqData: {
                title: extFormData.title || extFormData.groupTitle || 'FAQ Section',
                isVisible: extFormData.isVisible !== false,
                order: parseInt(String(extFormData.order)) || 1,
                groups: extFormData.faqData.groups.map(group => ({
                  groupTitle: group.groupTitle || 'Untitled Group',
                  isVisible: group.isVisible !== false,
                  order: group.order || 1,
                  questions: (group.questions || []).filter(q => q.question?.trim() && q.answer?.trim())
                })).filter(group => group.questions.length > 0)
              }
            }
          };
        } else {
          // Fallback to legacy FAQ structure for backward compatibility
          submitData = {
            ...submitData,
            title: extFormData.title || extFormData.groupTitle || 'FAQ Section',
            isActive: extFormData.isVisible !== false,
            sortOrder: nextSortOrder,
            metaData: {
              faqData: {
                title: extFormData.title || extFormData.groupTitle || 'FAQ Section',
                isVisible: extFormData.isVisible !== false,
                order: parseInt(String(extFormData.order)) || 1,
                items: faqItems.filter(item => item.question.trim() && item.answer.trim())
              }
            }
          };
        }
      }

      console.log('Submit data:', submitData); // Debug log
      await onSave(submitData as CreateDynamicPageData, editingItem?.id);
      
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData({});
      setParagraphTexts(['']);
      
      toast({
        title: "Success",
        description: `${sectionConfig.label} ${editingItem ? 'updated' : 'created'} successfully`
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingItem ? 'update' : 'create'} ${sectionConfig.label}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (item: DynamicPageData) => {
    try {
      await onDelete(item);
      setDeletingItem(null);
      toast({
        title: "Success",
        description: `${sectionConfig.label} deleted successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${sectionConfig.label}`,
        variant: "destructive"
      });
    }
  };

  const renderField = (field: string) => {
    const isImage = field.includes('Image') || field === 'image';
    const isVideo = field === 'videoSource';
    const isParagraphs = field === 'paragraphTexts';

    if (isParagraphs) {
      return (
        <div key={field} className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Paragraph Texts</Label>
            <Button type="button" variant="outline" size="sm" onClick={addParagraph}>
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Paragraph
            </Button>
          </div>
          <div className="space-y-2">
            {paragraphTexts.map((text, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={text}
                  onChange={(e) => updateParagraph(index, e.target.value)}
                  placeholder={`Paragraph ${index + 1}`}
                  className="flex-1 min-h-[80px]"
                />
                {paragraphTexts.length > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeParagraph(index)}
                    className="self-start mt-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (isImage || isVideo) {
      const currentValue = formData[field as keyof typeof formData] as string;
      
      return (
        <div key={field} className="space-y-3">
          <Label className="text-sm font-medium">
            {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
          </Label>
          
          {/* Media Preview */}
          {currentValue && (
            <div className="relative border rounded-lg overflow-hidden bg-gray-50">
              <div className="aspect-video max-w-md">
                {isVideo ? (
                  <video 
                    src={currentValue} 
                    controls 
                    className="w-full h-full object-cover"
                    poster=""
                  />
                ) : (
                  <SafeImage 
                    src={currentValue} 
                    alt={`Preview of ${field}`} 
                    width={400} 
                    height={225}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute top-2 right-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleInputChange(field, '')}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-2 bg-white border-t">
                <p className="text-xs text-muted-foreground truncate" title={currentValue}>
                  {currentValue}
                </p>
              </div>
            </div>
          )}
          
          <FileUpload
            ownerType="dynamic-pages"
            ownerId={section}
            onUploaded={(uploadedMedia) => {
              console.log('Media uploaded:', uploadedMedia);
              if (uploadedMedia && uploadedMedia.length > 0) {
                const media = uploadedMedia[0];
                const mediaUrl = media.filePath;
                handleMediaUpload(field, [{ filePath: mediaUrl }]);
              }
            }}
          />
          
          <Input
            value={currentValue || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={`Enter ${isVideo ? 'video' : 'image'} URL`}
            className="mt-2"
          />
        </div>
      );
    }

    const isTextarea = field === 'description' || field.includes('paragraph') || field === 'designerQuote' || field === 'answer';
    const isFaqField = field === 'faqItems';

    if (isFaqField) {
      return (
        <div key={field} className="space-y-6">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium text-gray-900">FAQ Groups Management</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFaqItem}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add FAQ Group
            </Button>
          </div>
          
          {/* Enhanced FAQ Groups Display */}
          <div className="space-y-6">
            {(formData as ExtendedFormData).faqData?.groups?.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-800">FAQ Group #{groupIndex + 1}</h4>
                  {((formData as ExtendedFormData).faqData?.groups?.length || 0) > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeFaqItem(groupIndex)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {/* Group Title */}
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={group.groupTitle || ''}
                      onChange={(e) => {
                        const newFaqData = { ...(formData as ExtendedFormData).faqData };
                        if (newFaqData.groups?.[groupIndex]) {
                          newFaqData.groups[groupIndex].groupTitle = e.target.value;
                          handleInputChange('faqData', newFaqData);
                        }
                      }}
                      placeholder="Enter group title (e.g., General, Technical, Billing)"
                      className="w-full"
                      required
                    />
                  </div>
                  
                  {/* Visibility Toggle */}
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={group.isVisible !== false}
                      onCheckedChange={(checked) => {
                        const newFaqData = { ...(formData as ExtendedFormData).faqData };
                        if (newFaqData.groups?.[groupIndex]) {
                          newFaqData.groups[groupIndex].isVisible = checked;
                          handleInputChange('faqData', newFaqData);
                        }
                      }}
                    />
                    <Label className="text-sm font-medium text-gray-700">
                      Visible to users
                    </Label>
                  </div>
                  
                  {/* Group Order */}
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Order
                    </Label>
                    <Input
                      type="number"
                      value={group.order || 1}
                      onChange={(e) => {
                        const newFaqData = { ...(formData as ExtendedFormData).faqData };
                        if (newFaqData.groups?.[groupIndex]) {
                          newFaqData.groups[groupIndex].order = parseInt(e.target.value) || 1;
                          handleInputChange('faqData', newFaqData);
                        }
                      }}
                      min="1"
                      className="w-24"
                    />
                  </div>
                  
                  {/* Questions for this group */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium text-gray-700">Questions in this group</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newFaqData = { ...(formData as ExtendedFormData).faqData };
                          if (newFaqData.groups?.[groupIndex]) {
                            if (!newFaqData.groups[groupIndex].questions) {
                              newFaqData.groups[groupIndex].questions = [];
                            }
                            newFaqData.groups[groupIndex].questions.push({
                              question: '',
                              answer: ''
                            });
                            handleInputChange('faqData', newFaqData);
                          }
                        }}
                      >
                        <PlusCircle className="h-3 w-3 mr-1" />
                        Add Question
                      </Button>
                    </div>
                    
                    {group.questions?.map((question, qIndex) => (
                      <div key={qIndex} className="bg-gray-50 border rounded-lg p-4 mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-600">Question #{qIndex + 1}</span>
                          {(group.questions?.length || 0) > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                const newFaqData = { ...(formData as ExtendedFormData).faqData };
                                if (newFaqData.groups?.[groupIndex]?.questions) {
                                  newFaqData.groups[groupIndex].questions = 
                                    newFaqData.groups[groupIndex].questions!.filter((_, i) => i !== qIndex);
                                  handleInputChange('faqData', newFaqData);
                                }
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="block text-xs font-medium text-gray-600 mb-1">Question</Label>
                            <Input
                              value={question.question || ''}
                              onChange={(e) => {
                                const newFaqData = { ...(formData as ExtendedFormData).faqData };
                                if (newFaqData.groups?.[groupIndex]?.questions?.[qIndex]) {
                                  newFaqData.groups[groupIndex].questions![qIndex].question = e.target.value;
                                  handleInputChange('faqData', newFaqData);
                                }
                              }}
                              placeholder="Enter the FAQ question"
                              className="w-full text-sm"
                            />
                          </div>
                          
                          <div>
                            <Label className="block text-xs font-medium text-gray-600 mb-1">Answer</Label>
                            <Textarea
                              value={question.answer || ''}
                              onChange={(e) => {
                                const newFaqData = { ...(formData as ExtendedFormData).faqData };
                                if (newFaqData.groups?.[groupIndex]?.questions?.[qIndex]) {
                                  newFaqData.groups[groupIndex].questions![qIndex].answer = e.target.value;
                                  handleInputChange('faqData', newFaqData);
                                }
                              }}
                              placeholder="Enter the detailed answer"
                              className="w-full min-h-[80px] text-sm resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-gray-500 text-sm mb-2">No questions in this group</p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const newFaqData = { ...(formData as ExtendedFormData).faqData };
                            if (newFaqData.groups?.[groupIndex]) {
                              if (!newFaqData.groups[groupIndex].questions) {
                                newFaqData.groups[groupIndex].questions = [];
                              }
                              newFaqData.groups[groupIndex].questions.push({
                                question: '',
                                answer: ''
                              });
                              handleInputChange('faqData', newFaqData);
                            }
                          }}
                        >
                          <PlusCircle className="h-3 w-3 mr-1" />
                          Add First Question
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-3">No FAQ groups added yet</p>
                <Button type="button" variant="outline" onClick={addFaqItem}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add First FAQ Group
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div key={field} className="space-y-3">
        <Label className="block text-sm font-medium text-gray-700">
          {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
          {(field === 'title' && sectionConfig.isFaq) && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {isTextarea ? (
          <Textarea
            value={(formData[field as keyof typeof formData] as string) || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
            className="w-full min-h-[80px] resize-none"
          />
        ) : (
          <Input
            value={(formData[field as keyof typeof formData] as string) || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
            className="w-full"
            required={field === 'title' && sectionConfig.isFaq}
          />
        )}
      </div>
    );
  };

  const PreviewDialog = ({ item, isOpen, onClose }: { item: DynamicPageData | null, isOpen: boolean, onClose: () => void }) => {
    if (!item) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {item.title || 'Untitled'}</DialogTitle>
            <DialogDescription>Preview of {sectionConfig.label} content</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {item.title && (
              <div>
                <h3 className="font-semibold mb-2">Title</h3>
                <p className="text-lg">{item.title}</p>
              </div>
            )}
            
            {item.subtitle && (
              <div>
                <h3 className="font-semibold mb-2">Subtitle</h3>
                <p className="text-muted-foreground">{item.subtitle}</p>
              </div>
            )}
            
            {item.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p>{item.description}</p>
              </div>
            )}
            
            {(item.desktopImage || item.mobileImage || item.image) && (
              <div>
                <h3 className="font-semibold mb-4">Images</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {item.desktopImage && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Desktop Image</p>
                      <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                        <div className="aspect-video">
                          <SafeImage 
                            src={item.desktopImage} 
                            alt="Desktop Preview" 
                            width={400} 
                            height={225} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="p-2 bg-white border-t">
                          <p className="text-xs text-muted-foreground truncate" title={item.desktopImage}>
                            {item.desktopImage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {item.mobileImage && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Mobile Image</p>
                      <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                        <div className="aspect-[3/4] max-w-[200px]">
                          <SafeImage 
                            src={item.mobileImage} 
                            alt="Mobile Preview" 
                            width={300} 
                            height={400} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="p-2 bg-white border-t">
                          <p className="text-xs text-muted-foreground truncate" title={item.mobileImage}>
                            {item.mobileImage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {item.image && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Image</p>
                      <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                        <div className="aspect-video">
                          <SafeImage 
                            src={item.image} 
                            alt="Image Preview" 
                            width={400} 
                            height={225} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="p-2 bg-white border-t">
                          <p className="text-xs text-muted-foreground truncate" title={item.image}>
                            {item.image}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {item.videoSource && (
              <div>
                <h3 className="font-semibold mb-4">Video</h3>
                <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                  <div className="aspect-video">
                    <video 
                      src={item.videoSource} 
                      controls 
                      className="w-full h-full object-cover"
                      poster=""
                    />
                  </div>
                  <div className="p-2 bg-white border-t">
                    <p className="text-xs text-muted-foreground truncate" title={item.videoSource}>
                      {item.videoSource}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {(item.paragraph1 || item.paragraph2) && (
              <div>
                <h3 className="font-semibold mb-2">Paragraphs</h3>
                {item.paragraph1 && <p className="mb-2">{item.paragraph1}</p>}
                {item.paragraph2 && <p>{item.paragraph2}</p>}
              </div>
            )}
            
            {item.paragraphTexts && Array.isArray(item.paragraphTexts) && (
              <div>
                <h3 className="font-semibold mb-2">Paragraph Texts</h3>
                {item.paragraphTexts.map((text: string, index: number) => (
                  <p key={index} className="mb-2">{text}</p>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <sectionConfig.icon className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {sectionConfig.label}
                {sectionConfig.isSlider && (
                  <Badge variant="outline" className="text-xs">
                    Slider ({items.length}/{sectionConfig.maxItems || '∞'})
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {sectionConfig.description}
                {sectionConfig.isSlider && (
                  <span className="block text-blue-600 text-xs mt-1">
                    💡 Each item creates a separate slide in the carousel
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
            size="sm"
            disabled={!!(sectionConfig.maxItems && items.length >= sectionConfig.maxItems)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {sectionConfig.isSlider ? 'Add Slide' : 'Add Item'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <sectionConfig.icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {sectionConfig.isSlider 
                ? 'No slides found for this slider' 
                : 'No content found for this section'
              }
            </p>
            {sectionConfig.isSlider && (
              <p className="text-sm text-blue-600 mb-4">
                Add multiple slides to create a dynamic hero carousel with different images and text for each slide
              </p>
            )}
            <Button 
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              variant="outline"
            >
              {sectionConfig.isSlider ? 'Create First Slide' : 'Create First Item'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {sectionConfig.isSlider && (
                        <Badge variant="secondary" className="text-xs">
                          Slide {index + 1}
                        </Badge>
                      )}
                      <h4 className="font-medium">
                        {item.title || `${sectionConfig.isSlider ? 'Slide' : 'Item'} ${index + 1}`}
                      </h4>
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {item.subtitle && (
                      <p className="text-sm text-muted-foreground mb-2">{item.subtitle}</p>
                    )}
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.buttonText && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Button:</span>
                        <Badge variant="outline" className="text-xs">{item.buttonText}</Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewItem(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingItem(item);
                        setIsFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Enhanced quick preview of media */}
                <div className="flex gap-2 mt-2">
                  {(item.desktopImage || item.image) && (
                    <div className="relative group">
                      <SafeImage 
                        src={item.desktopImage || item.image || ''} 
                        alt="Preview" 
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded border-2 border-gray-200 hover:border-primary transition-colors" 
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                  {item.mobileImage && item.mobileImage !== item.desktopImage && item.mobileImage !== item.image && (
                    <div className="relative group">
                      <SafeImage 
                        src={item.mobileImage} 
                        alt="Mobile Preview" 
                        width={48}
                        height={64}
                        className="w-12 h-16 object-cover rounded border-2 border-gray-200 hover:border-primary transition-colors" 
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded-b">
                        Mobile
                      </div>
                    </div>
                  )}
                  {item.videoSource && (
                    <div className="relative group">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded border-2 border-gray-200 hover:border-primary transition-colors flex items-center justify-center">
                        <Video className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200 flex items-center justify-center">
                        <div className="w-3 h-3 border-l-4 border-l-white ml-1 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className={sectionConfig.isFaq ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-3xl max-h-[90vh] overflow-y-auto"}>
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Edit' : 'Add New'} {sectionConfig.label}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {sectionConfig.isFaq 
                  ? (editingItem ? 'Update the FAQ group details and questions below.' : 'Fill in the details for your FAQ group.')
                  : (editingItem ? 'Update the content for this item' : 'Add new content to this section')
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {sectionConfig.isFaq ? (
                // Vertical layout for FAQ forms
                <div className="space-y-6">
                  {sectionConfig.fields.map(field => (
                    <div key={field} className="w-full">
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              ) : (
                // Grid layout for other forms
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sectionConfig.fields.map(field => (
                    <div key={field} className={sectionConfig.fields.includes('paragraphTexts') && field === 'paragraphTexts' ? 'md:col-span-2' : ''}>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              )}
              
              {!sectionConfig.isFaq && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isActive || false}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label>Active</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.sortOrder || 0}
                      onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                  </div>
                </div>
              )}
              
              {sectionConfig.isFaq && (
                <div className="border-t pt-4">
                  <div className="space-y-4">
                    {/* Visibility Toggle */}
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={(formData as ExtendedFormData).isVisible !== false}
                        onCheckedChange={(checked) => handleInputChange('isVisible', checked)}
                      />
                      <Label className="text-sm font-medium">Is Visible</Label>
                    </div>
                    
                    {/* Order Field */}
                    <div className="space-y-2">
                      <Label>Order</Label>
                      <Input
                        type="number"
                        value={(formData as ExtendedFormData).order || 1}
                        onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
                        className="w-24"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="border-t pt-4 mt-6">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} className="mr-2">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editingItem ? 'Update' : (sectionConfig.isFaq ? 'Create FAQ Group' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <PreviewDialog 
          item={previewItem} 
          isOpen={!!previewItem} 
          onClose={() => setPreviewItem(null)} 
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingItem?.title || 'this item'}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deletingItem && handleDelete(deletingItem)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
const DynamicPageForm: React.FC<DynamicPageFormProps> = ({ page, isOpen, onClose, onSave, section }) => {
  const [formData, setFormData] = useState<Partial<CreateDynamicPageData>>({});
  const [paragraphTexts, setParagraphTexts] = useState<string[]>(['']);
  const { toast } = useToast();
  
  const currentSection = page?.section || section;
  const requiredFields = currentSection ? SECTION_FIELDS[currentSection] : [];

  useEffect(() => {
    if (page) {
      setFormData({
        section: page.section,
        title: page.title || '',
        subtitle: page.subtitle || '',
        description: page.description || '',
        buttonText: page.buttonText || '',
        desktopImage: page.desktopImage || '',
        mobileImage: page.mobileImage || '',
        image: page.image || '',
        videoSource: page.videoSource || '',
        paragraph1: page.paragraph1 || '',
        paragraph2: page.paragraph2 || '',
        designerImage: page.designerImage || '',
        designerQuote: page.designerQuote || '',
        bannerImage: page.bannerImage || '',
        interiorImage: page.interiorImage || '',
        isActive: page.isActive,
        sortOrder: page.sortOrder
      });
      
      if (page.paragraphTexts && Array.isArray(page.paragraphTexts)) {
        setParagraphTexts(page.paragraphTexts);
      }
    } else if (section) {
      setFormData({
        section,
        isActive: true,
        sortOrder: 0
      });
      setParagraphTexts(['']);
    }
  }, [page, section]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMediaUpload = (field: string, files: any[]) => {
    if (files.length > 0) {
      const file = files[0];
      const mediaUrl = file.filePath || file.url || file.src;
      handleInputChange(field, mediaUrl);
    }
  };

  const addParagraph = () => {
    setParagraphTexts(prev => [...prev, '']);
  };

  const removeParagraph = (index: number) => {
    setParagraphTexts(prev => prev.filter((_, i) => i !== index));
  };

  const updateParagraph = (index: number, value: string) => {
    setParagraphTexts(prev => prev.map((text, i) => i === index ? value : text));
  };

  const handleSubmit = () => {
    if (!currentSection) {
      toast({
        title: "Error",
        description: "Please select a section",
        variant: "destructive"
      });
      return;
    }

    const submitData = {
      ...formData,
      section: currentSection,
      paragraphTexts: requiredFields.includes('paragraphTexts') ? paragraphTexts.filter(p => p.trim()) : undefined
    };

    onSave(submitData as CreateDynamicPageData);
  };

  const renderField = (field: string) => {
    const isImage = field.includes('Image') || field === 'image';
    const isVideo = field === 'videoSource';
    const isParagraphs = field === 'paragraphTexts';

    if (isParagraphs) {
      return (
        <div key={field} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Paragraph Texts</Label>
            <Button type="button" variant="outline" size="sm" onClick={addParagraph}>
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Paragraph
            </Button>
          </div>
          {paragraphTexts.map((text, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => updateParagraph(index, e.target.value)}
                placeholder={`Paragraph ${index + 1}`}
                className="flex-1"
              />
              {paragraphTexts.length > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeParagraph(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (isImage || isVideo) {
      const currentValue = formData[field as keyof typeof formData] as string;
      
      return (
        <div key={field} className="space-y-3">
          <Label>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}</Label>
          
          {/* Enhanced Media Preview */}
          {currentValue && (
            <div className="relative border rounded-lg overflow-hidden bg-gray-50">
              <div className="aspect-video max-w-md">
                {isVideo ? (
                  <video 
                    src={currentValue} 
                    controls 
                    className="w-full h-full object-cover"
                    poster=""
                  />
                ) : (
                  <SafeImage 
                    src={currentValue} 
                    alt={`Preview of ${field}`} 
                    width={400} 
                    height={225}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute top-2 right-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleInputChange(field, '')}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-2 bg-white border-t">
                <p className="text-xs text-muted-foreground truncate" title={currentValue}>
                  {currentValue}
                </p>
              </div>
            </div>
          )}
          
          <FileUpload
            ownerType="dynamic-pages"
            ownerId={currentSection}
            onUploaded={(uploadedMedia) => {
              console.log('Media uploaded:', uploadedMedia);
              if (uploadedMedia && uploadedMedia.length > 0) {
                const media = uploadedMedia[0];
                const mediaUrl = media.filePath;
                handleMediaUpload(field, [{ filePath: mediaUrl }]);
              }
            }}
          />
          
          <Input
            value={currentValue || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={`Enter ${isVideo ? 'video' : 'image'} URL`}
          />
        </div>
      );
    }

    const isTextarea = field === 'description' || field.includes('paragraph') || field === 'designerQuote';
    
    return (
      <div key={field} className="space-y-2">
        <Label>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}</Label>
        {isTextarea ? (
          <Textarea
            value={(formData[field as keyof typeof formData] as string) || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={`Enter ${field}`}
          />
        ) : (
          <Input
            value={(formData[field as keyof typeof formData] as string) || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={`Enter ${field}`}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{page ? 'Edit' : 'Create'} Dynamic Page Content</DialogTitle>
          <DialogDescription>
            {currentSection && `Managing content for: ${SECTION_LABELS[currentSection]}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!page && (
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={formData.section} onValueChange={(value) => handleInputChange('section', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {currentSection && requiredFields.map(field => renderField(field))}
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isActive || false}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label>Active</Label>
          </div>
          
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={formData.sortOrder || 0}
              onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{page ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function DynamicPagesPage() {
  const [dynamicPages, setDynamicPages] = useState<DynamicPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('Home Page');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<DynamicPageData | null>(null);
  const [deletingPage, setDeletingPage] = useState<DynamicPageData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDynamicPages();
  }, []);

  const fetchDynamicPages = async () => {
    try {
      const response = await fetch('/api/dynamic-pages');
      if (response.ok) {
        const data = await response.json();
        setDynamicPages(data);
      } else {
        throw new Error('Failed to fetch dynamic pages');
      }
    } catch (error) {
      console.error('Error fetching dynamic pages:', error);
      toast({
        title: "Error",
        description: "Failed to load dynamic pages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPage(null);
    setIsFormOpen(true);
  };

  const handleEdit = (page: DynamicPageData) => {
    setEditingPage(page);
    setIsFormOpen(true);
  };

  const handleSave = async (data: CreateDynamicPageData | UpdateDynamicPageData, editingId?: string) => {
    try {
      const url = editingId ? `/api/dynamic-pages/${editingId}` : '/api/dynamic-pages';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await fetchDynamicPages();
        setIsFormOpen(false);
        setEditingPage(null);
        toast({
          title: "Success",
          description: `Dynamic page ${editingId ? 'updated' : 'created'} successfully`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save dynamic page (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving dynamic page:', error);
      toast({
        title: "Error",
        description: "Failed to save dynamic page",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDelete = async (page: DynamicPageData) => {
    try {
      const response = await fetch(`/api/dynamic-pages/${page.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchDynamicPages();
        setDeletingPage(null);
        toast({
          title: "Success",
          description: "Dynamic page deleted successfully"
        });
      } else {
        throw new Error('Failed to delete dynamic page');
      }
    } catch (error) {
      console.error('Error deleting dynamic page:', error);
      toast({
        title: "Error",
        description: "Failed to delete dynamic page",
        variant: "destructive"
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dynamic content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Pages Management</h1>
          <p className="text-muted-foreground">
            Manage your website content with dedicated forms for each section. 
            Upload images, videos, and organize content by page sections.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      </div>

      <Tabs value={selectedGroup} onValueChange={setSelectedGroup}>
        <TabsList className="grid w-full grid-cols-4">
          {Object.keys(SECTION_GROUPS).map(group => (
            <TabsTrigger key={group} value={group} className="text-sm">
              {group}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(SECTION_GROUPS).map(([groupName, sections]) => (
          <TabsContent key={groupName} value={groupName} className="space-y-6">
            <div className="grid gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">{groupName} Content</h3>
                <p className="text-blue-700 text-sm">
                  Manage all content sections for the {groupName.toLowerCase()}. 
                  Each section has its own dedicated form with relevant fields for images, videos, and text content.
                </p>
              </div>
              
              {sections.map(section => (
                <SectionForm
                  key={section.key}
                  section={section.key}
                  pages={dynamicPages}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <DynamicPageForm
        page={editingPage}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPage(null);
        }}
        onSave={(data) => handleSave(data, editingPage?.id)}
      />

      <AlertDialog open={!!deletingPage} onOpenChange={() => setDeletingPage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dynamic Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPage(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingPage && handleDelete(deletingPage)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}