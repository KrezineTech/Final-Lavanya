

import type { LucideIcon } from "lucide-react";

export type StatCard = {
  title: string;
  value: string;
  icon: LucideIcon;
  change: string;
};

export type SummaryCardData = {
  title: string;
  amount: string;
  icon: LucideIcon;
  color: string;
  breakdown?: {
    cash: string;
    card: string;
    credit: string;
  };
};

export type OrderStatusCardData = {
  title: string;
  count: number;
  icon: LucideIcon;
  iconBgColor: string;
  amount?: string;
};

export type RecentOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  total: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
};

// Dynamic Pages Types
export type DynamicPageSection = 
  | 'HOME_HERO_SLIDER'
  | 'HOME_VIDEO_SHOWCASE'
  | 'HOME_MEET_ARTIST'
  | 'HOME_CUSTOM_PAINTING_SECTION'
  | 'HOME_INDIAN_ART_SECTION'
  | 'HOME_SUBCATEGORY_SLIDER'
  | 'HOME_OUR_STANDARDS'
  | 'HOME_TESTIMONIAL_SLIDER'
  | 'ABOUT_PAGE_HEADER'
  | 'ABOUT_CONTENT'
  | 'SHARED_REVIEWS_HEADER'
  | 'SHARED_BLOG_HEADER'
  | 'SHARED_FAQ_HEADER'
  | 'SHARED_CONTACT_HEADER'
  | 'SHARED_CHECKOUT_HEADER'

export type DynamicPageData = {
  id: string
  section: DynamicPageSection
  title?: string | null
  subtitle?: string | null
  description?: string | null
  buttonText?: string | null
  desktopImage?: string | null
  mobileImage?: string | null
  image?: string | null
  videoSource?: string | null
  paragraph1?: string | null
  paragraph2?: string | null
  designerImage?: string | null
  designerQuote?: string | null
  bannerImage?: string | null
  interiorImage?: string | null
  paragraphTexts?: any | null
  metaData?: any | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type CreateDynamicPageData = Omit<DynamicPageData, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateDynamicPageData = Partial<CreateDynamicPageData>

export type Product = {
  id: string;
  name: string;
  description: string;
  sku: string;
  images: string[];
  price: number;
  salePrice?: number;
  stock: number;
  categoryIds: string[];
  collectionIds: string[];
  "data-ai-hint"?: string;
  size?: string;
  variations?: string;
  barcode?: string;
  slug?: string;
  tags?: string;
  videoUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
};

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  "data-ai-hint"?: string;
  size?: string;
};

export type Order = {
  id: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  date: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending';
  total: number;
  paymentMethod: string;
  shippingAddress: string;
  billingAddress: string;
  items: OrderItem[];
  shippingType?: string;
  note?: string;
};

export type OrderMessage = {
  author: 'Customer' | 'Seller';
  authorName: string;
  authorAvatar?: string;
  date: string;
  content: string | React.ReactNode;
};

export type TrackingEvent = {
    status: string;
    location: string;
    date: string;
};

export type OrderItemDetail = {
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string | null;
  total: number;
  // Buy X Get Y Free Item Fields
  isFreeItem?: boolean;
  originalPrice?: number | null;
  freeItemType?: string | null;
  discountCode?: string | null;
};

export type NewOrder = {
  id: string;
  shipByDate: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalPrice: string;
  isGift: boolean;
  isPersonalizable: boolean;
  product: {
    name: string;
    image: string;
    hint: string;
    quantity: number;
    sku: string;
    size: string;
    personalization: string;
    price: number;
    transactionId: string;
  };
  orderedDate: string;
  shipping: {
    method: string;
    cost: string;
    destination: string;
  };
  shippingAddress: string;
  destinationCountry: string;
  hasNote: boolean;
  status: 'Shipped' | 'Not Shipped' | 'Delivered';
  source?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  messages?: OrderMessage[];
  privateNote?: string;
  trackingId?: string;
  trackingHistory?: TrackingEvent[];
  // Support multiple items including free items from Buy X Get Y
  items?: OrderItemDetail[];
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isActive: boolean;
  orders: number;
  totalSpent: number;
  totalSpentCents: number;
  lastLoginAt?: Date | null;
  lastFrontendLoginAt?: Date | null;
  frontendSessionActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  sessionCount: number;
  emailVerified?: Date | null;
  tags: string[];
  recentOrders?: CustomerOrder[];
  statistics?: {
    totalOrders: number;
    totalPaidOrders: number;
    totalSpentCents: number;
    totalSpent: number;
    averageOrderValueCents: number;
    averageOrderValue: number;
    recentOrdersCount: number;
    firstOrderDate?: Date | null;
    lastOrderDate?: Date | null;
  };
};

export type CustomerOrder = {
  id: string;
  number: string;
  grandTotalCents: number;
  grandTotal: number;
  currency: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  itemsTotal: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    priceCents: number;
    product?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }[];
};

export type User = {
  name: string;
  email: string;
  contactNumber: string;
  role: 'Super Admin' | 'Admin' | 'Editor';
  avatar: string;
};

export type TicketReply = {
  author: 'Customer' | 'Support';
  message: string;
  timestamp: string;
};

export type SupportTicket = {
  id: string;
  customer: {
    name: string;
    email: string;
  };
  subject: string;
  status: 'Open' | 'In Progress' | 'Closed';
  lastUpdate: string;
  initialMessage: string;
  history: TicketReply[];
};

export type ShippingZone = { 
  id: string;
  name: string; 
  countries: string; 
};

export type Package = { 
  id: string;
  name: string; 
  dimensions: string; 
  weight: string; 
};

export type Category = {
  id: string;
  name: string;
  description: string;
  image: string;
  "data-ai-hint"?: string;
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  image: string;
  "data-ai-hint"?: string;
};

export type PageContentBlock = {
  id: string;
  type: 'title-description' | 'accordion' | 'image' | 'just-image';
  title: string;
  content: string;
  src?: string;
  alt?: string;
};

export type Page = {
  id: string;
  title: string;
  content: string | PageContentBlock[];
  slug: string;
  status: 'Published' | 'Draft';
  createdAt: string;
  updatedAt: string;
};

export type Blog = {
  id: string;
  title: string;
  // content can be a plain string or structured PageContentBlock[] as used by the editor
  content: string | PageContentBlock[];
  slug: string;
  status: 'Published' | 'Draft';
  author: string;
  featuredImage: string;
  'data-ai-hint'?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type Faq = {
  id: string;
  title: string;
  question: string;
  answer: string;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Review = {
  id: string;
  customerName: string;
  customerAvatar: string;
  productId: string;
  productName: string;
  productImage: string;
  rating: number;
  title: string;
  content: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
};

export type Permission =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.manage'
  | 'products.view'
  | 'products.manage'
  | 'content.view'
  | 'content.manage'
  | 'customers.view'
  | 'customers.manage'
  | 'analytics.view'
  | 'reviews.view'
  | 'reviews.manage'
  | 'support.view'
  | 'support.manage'
  | 'shipping.view'
  | 'shipping.manage'
  | 'payments.view'
  | 'payments.manage'
  | 'settings.view'
  | 'settings.manage'
  | 'users.view'
  | 'users.manage'
  | 'pages.view'
  | 'pages.manage'
  | 'blogs.view'
  | 'blogs.manage';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Admin' | 'Editor' | 'Viewer' | 'Custom';
  status: 'Active' | 'Pending' | 'Inactive';
  lastLogin: string;
  permissions: Permission[];
};

export type MediaItem = {
  id: string;
  type: 'image' | 'video';
  src: string;
  title: string;
  thumbnail?: string;
  'data-ai-hint'?: string;
  alt?: string;
};

export type CountrySpecificPrice = {
    id: string;
    country: string;
    discountPercentage?: number;
    fixedPrice?: number;
    type?: 'percentage' | 'fixed';
    value?: number;
};

export type Listing = {
    id: string;
    title: string;
    slug?: string;
    sku: string;
    stock: number;
    priceMin: number;
    priceMax: number;
    hasVideo: boolean;
    sortOrder?: number;
    isUpdating?: boolean; // UI state for loading indicators
    last30Days: {
        visits: number;
        favorites: number;
    };
    allTime: {
        sales: number;
        revenue: number;
        renewals: number;
    };
    image: string;
    hint: string;
    status: 'Active' | 'Draft' | 'Expired' | 'Sold Out' | 'Inactive';
    section: string;
    shippingProfile: string;
    tags: string[];
    medium?: string[];
    style?: string[];
    materials?: string[];
    techniques?: string[];
    salePrice?: number;
    // Optional fields used across the UI
    description?: string;
    personalization?: boolean;
    returnPolicy?: string;
    collection?: string;
    countrySpecificPrices?: CountrySpecificPrice[];
    isVideoIntegratedVisible?: boolean;
    
    // Extended Shopify-compatible fields
    handle?: string;
    vendor?: string;
    productType?: string;
    giftCard?: boolean;
    published?: boolean;
    
    // Additional fields for image resolution
    metadata?: any; // JSON metadata from database
    media?: Array<{
        id: string;
        filePath: string;
        fileName: string;
        fileType: 'IMAGE' | 'VIDEO';
        mimeType?: string;
        isPrimary: boolean;
        altText?: string;
    }>;
    
    // Variant data
    variantWeight?: number;
    variantBarcode?: string;
    variantInventoryPolicy?: string;
    variantFulfillmentService?: string;
    variantRequiresShipping?: boolean;
    variantTaxable?: boolean;
    variantWeightUnit?: string;
    variantTaxCode?: string;
    
    // Google Shopping
    googleProductCategory?: string;
    googleGender?: string;
    googleAgeGroup?: string;
    googleMpn?: string;
    googleCondition?: string;
    googleCustomProduct?: string;
    
    // Pricing
    costPerItem?: number;
    priceUnitedStates?: number;
    compareAtPriceUnitedStates?: number;
    includedUnitedStates?: boolean;
    priceInternational?: number;
    compareAtPriceInternational?: number;
    includedInternational?: boolean;
    
    // Product options
    option1Name?: string;
    option1Value?: string;
    option2Name?: string;
    option2Value?: string;
    option3Name?: string;
    option3Value?: string;
    
    // SEO
    seoTitle?: string;
    seoDescription?: string;
    
    // Images
    imageAltText?: string;
    
    // Timestamps
    createdAt?: Date;
    updatedAt?: Date;
};

export type Variation = {
  id: string;
  name: string;
  price: number;
  visible: boolean;
};

export type ListingPage = {
    id: string;
    title: string;
    image: string;
    hint: string;
    websiteUrl: string;
    about: {
        title: string;
        photos: {
            id: string;
            src: string;
            hint: string;
            isPrimary?: boolean;
        }[];
  video: { id: string; src: string; hint?: string } | null;
    };
    priceAndInventory: {
        price: number;
        salePrice?: number;
        quantity: number;
        sku: string;
        currency?: string;
        compareAtPrice?: number;
    };
    countrySpecificPrices?: CountrySpecificPrice[];
    variations: Variation[];
    variants?: {
        id: string;
        sku?: string;
        title: string;
        option1Name?: string;
        option1Value?: string;
        option2Name?: string;
        option2Value?: string;
        option3Name?: string;
        option3Value?: string;
        priceCents: number;
        price: number;
        compareAtCents?: number | null;
        compareAtPrice?: number | null;
        inventoryQty: number;
        weightGrams?: number | null;
        requiresShipping: boolean;
        taxable: boolean;
        barcode?: string;
        position: number;
        createdAt: string;
        updatedAt: string;
    }[];
    details: {
        shortDescription: string;
        description: string;
        productionPartner: string | null;
        category?: string;
        collection?: string;
        tags: string[];
        materials: string[];
        medium?: string[];
        style?: string[];
        techniques?: string[];
    };
    physicalAttributes?: {
        heightMm?: number;
        widthMm?: number;
        depthMm?: number;
        weightGrams?: number;
    };
    features?: {
        isFeatured?: boolean;
        inventoryManaged?: boolean;
        ratingAverage?: number;
        numReviews?: number;
    };
    shipping: {
        origin: string;
        processingTime: string;
        fixedShipping: {
            country: string;
            service: string;
            price: number;
        }[];
        returnPolicyDays: number;
    };
    seo: {
        metaTitle: string;
        metaDescription: string;
    };
    metadata?: {
        slug?: string;
        createdAt?: string;
        updatedAt?: string;
        internalNotes?: string;
    };
    personalization?: boolean;
    status?: 'Active' | 'Draft' | 'Expired' | 'Sold Out' | 'Inactive';
    isVideoIntegratedVisible?: boolean;
};export type Message = {
    id: number;
    name: string;
    subject: string;
    time: string;
    read: boolean;
    avatar: string;
    privateNote: string;
    folder: 'Inbox' | 'Sent' | 'Trash' | 'Archive' | 'Spam';
    isOrderHelp?: boolean;
    isPreviousBuyer?: boolean;
    conversation?: {
        author: string;
        time: string;
        content: React.ReactNode;
    }[];
    mostRecentOrder?: {
        itemCount: number;
        price: string;
        status: string;
        orderId: string;
        image: string;
        'data-ai-hint': string;
    };
    orderHistory?: {
        id: string;
        status: string;
        image: string;
        'data-ai-hint': string;
        name: string;
        price: string;
        quantity: number;
    }[];
    totalPurchased?: string;
};

export type QuickReply = {
    id: string;
    title: string;
    name: string;
    content: string;
    savedCount: number;
};

export type Discount = {
    id: string;
  title: string;
  code: string;
  description?: string | null;
  status: 'Active' | 'Scheduled' | 'Expired' | 'Draft';
  method: 'Code' | 'Automatic';
  type: 'Amount off products' | 'Buy X get Y';
  value?: number | null;
  valueUnit?: string | null;
  combinations?: {
    product?: boolean;
    order?: boolean;
    shipping?: boolean;
  } | null;
  used: number;
  startAt?: string | null;
  endAt?: string | null;
  limitTotalUses?: number | null;
  limitPerUser?: boolean | null;
  requirements?: any | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type BuyXGetYDiscount = {
    id: string;
    method: 'Code' | 'Automatic';
    code: string;
    customerBuys: {
        type: 'min-quantity' | 'min-purchase';
        quantity?: number;
        amount?: number;
        appliesTo: 'specific-products' | 'specific-collections';
        appliesToIds: string[];
    };
    customerGets: {
        quantity: number;
        appliesTo: 'specific-products' | 'specific-collections';
        appliesToIds: string[];
        discountedValue: {
            type: 'percentage' | 'amount-off' | 'free';
            value?: number;
        };
    };
    maxUsesPerOrder: boolean;
    eligibility: 'all-customers' | 'specific-segments' | 'specific-customers';
    maxUses: {
        total: boolean;
        totalValue?: number;
        perCustomer: boolean;
    };
    combinations: {
        product: boolean;
        order: boolean;
        shipping: boolean;
    };
    activeDates: {
        start: string;
        end?: string;
    };
    status: 'Active' | 'Scheduled' | 'Expired' | 'Draft';
};
