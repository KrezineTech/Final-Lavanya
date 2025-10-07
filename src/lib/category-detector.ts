/**
 * Automated Category Detection System
 * 
 * This module provides intelligent category detection for products
 * based on title, description, tags, handle, and vendor information.
 * 
 * Features:
 * - Keyword-based matching with confidence scoring
 * - Multi-field analysis (title, tags, description, etc.)
 * - Hierarchical category matching (specific → general)
 * - Configurable rules and thresholds
 * - Production-ready with fallbacks
 */

export interface CategoryRule {
  category: string;
  keywords: string[];
  priority: number; // Higher priority = checked first
  minConfidence?: number; // Minimum confidence score (0-100)
}

export interface CategoryDetectionResult {
  category: string;
  confidence: number; // 0-100
  matchedKeywords: string[];
  source: 'title' | 'tags' | 'description' | 'handle' | 'vendor' | 'multiple';
}

/**
 * Comprehensive category rules with keywords and priorities
 * Higher priority categories are checked first (more specific)
 */
export const CATEGORY_RULES: CategoryRule[] = [
  // Religious & Spiritual Art (High Priority - Very Specific)
  {
    category: 'Sikh Art',
    keywords: [
      'sikh', 'gurbani', 'guru', 'onkar', 'ek onkar', 'waheguru', 
      'khanda', 'mool mantar', 'khalsa', 'punjabi art', 'punjab art',
      'golden temple', 'amritsar', 'guru nanak', 'guru gobind'
    ],
    priority: 100,
    minConfidence: 70
  },
  {
    category: 'Hindu Art',
    keywords: [
      'ganesh', 'ganesha', 'krishna', 'shiva', 'lakshmi', 'durga', 
      'hanuman', 'ram', 'radha', 'saraswati', 'kali', 'vishnu',
      'hindu', 'hinduism', 'om', 'aum', 'mantra', 'yantra',
      'diwali', 'holi', 'navratri', 'puja'
    ],
    priority: 100,
    minConfidence: 70
  },
  {
    category: 'Buddhist Art',
    keywords: [
      'buddha', 'buddhist', 'zen', 'meditation', 'dharma', 'nirvana',
      'bodhi', 'lotus position', 'tibetan', 'mandala buddhist',
      'enlightenment', 'buddhism', 'mindfulness'
    ],
    priority: 100,
    minConfidence: 70
  },
  {
    category: 'Christian Art',
    keywords: [
      'christian', 'jesus', 'christ', 'cross', 'angel', 'virgin mary',
      'madonna', 'biblical', 'church', 'gospel', 'christian art',
      'crucifixion', 'resurrection'
    ],
    priority: 100,
    minConfidence: 70
  },
  {
    category: 'Islamic Art',
    keywords: [
      'islamic', 'muslim', 'calligraphy', 'arabic', 'allah', 'quran',
      'mosque', 'minaret', 'islamic pattern', 'islamic geometry',
      'arabic calligraphy'
    ],
    priority: 100,
    minConfidence: 70
  },
  
  // Animal Art (Medium-High Priority - Specific)
  {
    category: 'Cow Art',
    keywords: [
      'cow', 'bull', 'cattle', 'gaumata', 'kamadhenu', 'nandi',
      'sacred cow', 'cow painting', 'cow art'
    ],
    priority: 90,
    minConfidence: 75
  },
  {
    category: 'Elephant Art',
    keywords: [
      'elephant', 'gaja', 'elephant art', 'elephant painting',
      'indian elephant', 'african elephant', 'elephant herd'
    ],
    priority: 90,
    minConfidence: 75
  },
  {
    category: 'Horse Art',
    keywords: [
      'horse', 'mare', 'stallion', 'equine', 'horses', 'mustang',
      'horse painting', 'horse art', 'wild horse'
    ],
    priority: 90,
    minConfidence: 75
  },
  {
    category: 'Bird Art',
    keywords: [
      'peacock', 'parrot', 'bird', 'swan', 'eagle', 'dove', 'hummingbird',
      'flamingo', 'owl', 'birds', 'avian', 'feather'
    ],
    priority: 85,
    minConfidence: 70
  },
  {
    category: 'Wildlife Art',
    keywords: [
      'tiger', 'lion', 'leopard', 'panther', 'cheetah', 'wildlife',
      'wild animal', 'safari', 'jungle animal', 'big cat'
    ],
    priority: 85,
    minConfidence: 70
  },
  {
    category: 'Pet Art',
    keywords: [
      'dog', 'puppy', 'canine', 'cat', 'kitten', 'feline', 'pet',
      'domestic animal'
    ],
    priority: 85,
    minConfidence: 75
  },
  {
    category: 'Aquatic Art',
    keywords: [
      'fish', 'koi', 'aquatic', 'dolphin', 'whale', 'ocean life',
      'sea creature', 'marine life', 'underwater'
    ],
    priority: 85,
    minConfidence: 70
  },
  
  // Nature & Landscape (Medium Priority)
  {
    category: 'Mandala Art',
    keywords: [
      'mandala', 'mandala art', 'mandala painting', 'mandala design',
      'circular pattern', 'sacred geometry mandala'
    ],
    priority: 95,
    minConfidence: 80
  },
  {
    category: 'Floral Art',
    keywords: [
      'flower', 'floral', 'rose', 'lotus', 'botanical', 'blossom',
      'bloom', 'bouquet', 'garden', 'petal', 'flowers'
    ],
    priority: 80,
    minConfidence: 70
  },
  {
    category: 'Nature Art',
    keywords: [
      'tree', 'forest', 'woods', 'jungle', 'bamboo', 'nature',
      'natural', 'wilderness', 'foliage', 'greenery'
    ],
    priority: 75,
    minConfidence: 65
  },
  {
    category: 'Landscape Art',
    keywords: [
      'mountain', 'valley', 'landscape', 'scenery', 'hill', 'vista',
      'countryside', 'terrain', 'panorama'
    ],
    priority: 75,
    minConfidence: 65
  },
  {
    category: 'Seascape Art',
    keywords: [
      'ocean', 'sea', 'beach', 'wave', 'coastal', 'shore', 'seascape',
      'maritime', 'nautical', 'seaside'
    ],
    priority: 80,
    minConfidence: 70
  },
  {
    category: 'Sky Art',
    keywords: [
      'sunset', 'sunrise', 'sky', 'cloud', 'dusk', 'dawn', 'twilight',
      'skyscape', 'horizon', 'celestial'
    ],
    priority: 75,
    minConfidence: 65
  },
  
  // Abstract & Modern (Medium Priority)
  {
    category: 'Abstract Art',
    keywords: [
      'abstract', 'modern', 'contemporary', 'geometric', 'cubist',
      'non-representational', 'expressionism', 'abstract painting'
    ],
    priority: 70,
    minConfidence: 60
  },
  {
    category: 'Minimalist Art',
    keywords: [
      'minimalist', 'minimal', 'simple', 'clean', 'minimalism',
      'sparse', 'reduced', 'essential'
    ],
    priority: 75,
    minConfidence: 70
  },
  {
    category: 'Colorful Art',
    keywords: [
      'colorful', 'vibrant', 'rainbow', 'multicolor', 'bright',
      'vivid', 'chromatic', 'color burst', 'psychedelic'
    ],
    priority: 65,
    minConfidence: 60
  },
  
  // Cultural & Regional (Medium Priority)
  {
    category: 'Indian Art',
    keywords: [
      'indian', 'india', 'bharatiya', 'bharat', 'indian art',
      'indian culture', 'indian heritage'
    ],
    priority: 70,
    minConfidence: 65
  },
  {
    category: 'Punjabi Art',
    keywords: [
      'punjabi', 'punjab', 'punjabi culture', 'punjabi heritage',
      'bhangra', 'punjabi folk'
    ],
    priority: 85,
    minConfidence: 75
  },
  {
    category: 'Rajasthani Art',
    keywords: [
      'rajasthani', 'rajasthan', 'rajasthani art', 'rajasthani painting',
      'jaipur', 'udaipur', 'jodhpur'
    ],
    priority: 85,
    minConfidence: 75
  },
  {
    category: 'Folk Art',
    keywords: [
      'madhubani', 'warli', 'pattachitra', 'gond', 'tribal',
      'folk art', 'traditional art', 'indigenous art'
    ],
    priority: 85,
    minConfidence: 75
  },
  {
    category: 'Mughal Art',
    keywords: [
      'mughal', 'persian', 'miniature', 'mughal painting',
      'mughal era', 'mughal style'
    ],
    priority: 85,
    minConfidence: 75
  },
  
  // Portrait & People (Medium Priority)
  {
    category: 'Portrait Art',
    keywords: [
      'portrait', 'face', 'woman', 'man', 'lady', 'gentleman',
      'headshot', 'likeness', 'person', 'human'
    ],
    priority: 70,
    minConfidence: 65
  },
  {
    category: 'Romantic Art',
    keywords: [
      'couple', 'lovers', 'romance', 'love', 'romantic',
      'affection', 'intimacy', 'courtship'
    ],
    priority: 75,
    minConfidence: 70
  },
  {
    category: 'Family Art',
    keywords: [
      'family', 'children', 'kids', 'mother', 'father', 'parent',
      'childhood', 'family portrait'
    ],
    priority: 75,
    minConfidence: 70
  },
  
  // Special Themes (Medium-Low Priority)
  {
    category: 'Spiritual Art',
    keywords: [
      'spiritual', 'divine', 'sacred', 'religious', 'deity',
      'worship', 'prayer', 'devotional', 'mystical'
    ],
    priority: 80,
    minConfidence: 65
  },
  {
    category: 'Wall Art',
    keywords: [
      'wall art', 'canvas', 'poster', 'print', 'framed',
      'wall decor', 'wall hanging', 'mural'
    ],
    priority: 60,
    minConfidence: 60
  },
  {
    category: 'Home Decor',
    keywords: [
      'home decor', 'decoration', 'decorative', 'interior',
      'home decoration', 'interior design'
    ],
    priority: 60,
    minConfidence: 60
  },
  {
    category: 'Musical Art',
    keywords: [
      'music', 'musical', 'instrument', 'guitar', 'piano', 'sitar',
      'tabla', 'musician', 'melody'
    ],
    priority: 75,
    minConfidence: 70
  },
  {
    category: 'Dance Art',
    keywords: [
      'dance', 'dancing', 'dancer', 'bharatnatyam', 'kathak',
      'odissi', 'kuchipudi', 'ballet', 'choreography'
    ],
    priority: 75,
    minConfidence: 70
  },
  {
    category: 'Vintage Art',
    keywords: [
      'vintage', 'retro', 'classic', 'antique', 'old-fashioned',
      'nostalgic', 'historical'
    ],
    priority: 70,
    minConfidence: 65
  },
  {
    category: 'Metallic Art',
    keywords: [
      'gold', 'golden', 'metallic', 'silver', 'bronze', 'copper',
      'gilt', 'shimmering', 'lustrous'
    ],
    priority: 70,
    minConfidence: 65
  },
  
  // Default fallback (Lowest Priority)
  {
    category: 'Art Painting',
    keywords: [
      'painting', 'art', 'artwork', 'canvas art', 'acrylic',
      'oil painting', 'watercolor', 'fine art'
    ],
    priority: 10,
    minConfidence: 30
  }
];

/**
 * Normalize and clean text for matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate keyword match confidence score
 */
function calculateConfidence(
  text: string,
  keywords: string[],
  matchedKeywords: string[]
): number {
  const normalizedText = normalizeText(text);
  
  // Base confidence from matched keywords
  const matchRatio = matchedKeywords.length / keywords.length;
  let confidence = matchRatio * 100;
  
  // Bonus for exact phrase matches
  const exactMatches = matchedKeywords.filter(kw => 
    normalizedText.includes(normalizeText(kw))
  );
  confidence += exactMatches.length * 5;
  
  // Bonus for matches in title (more weight)
  const titleMatches = matchedKeywords.filter(kw => 
    text.toLowerCase().includes(kw.toLowerCase())
  );
  confidence += titleMatches.length * 3;
  
  // Cap at 100
  return Math.min(confidence, 100);
}

/**
 * Find matching keywords in text
 */
function findMatchingKeywords(text: string, keywords: string[]): string[] {
  const normalizedText = normalizeText(text);
  
  return keywords.filter(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    return normalizedText.includes(normalizedKeyword);
  });
}

/**
 * Detect category from product data with confidence scoring
 */
export function detectCategory(data: {
  title?: string;
  description?: string;
  tags?: string | string[];
  handle?: string;
  vendor?: string;
  type?: string;
}): CategoryDetectionResult {
  const {
    title = '',
    description = '',
    tags = '',
    handle = '',
    vendor = '',
    type = ''
  } = data;
  
  // If type is already provided and non-empty, use it with high confidence
  if (type && type.trim() !== '') {
    return {
      category: type.trim(),
      confidence: 100,
      matchedKeywords: [],
      source: 'title'
    };
  }
  
  // Combine all text fields for analysis
  const tagsText = Array.isArray(tags) ? tags.join(' ') : tags;
  const combinedText = `${title} ${tagsText} ${handle} ${description}`.substring(0, 1000); // Limit for performance
  
  // Track best match
  let bestMatch: CategoryDetectionResult = {
    category: 'Art Painting',
    confidence: 0,
    matchedKeywords: [],
    source: 'title'
  };
  
  // Sort rules by priority (highest first)
  const sortedRules = [...CATEGORY_RULES].sort((a, b) => b.priority - a.priority);
  
  // Check each rule
  for (const rule of sortedRules) {
    const matchedKeywords = findMatchingKeywords(combinedText, rule.keywords);
    
    if (matchedKeywords.length > 0) {
      const confidence = calculateConfidence(combinedText, rule.keywords, matchedKeywords);
      
      // Check if this match is better than current best
      if (confidence >= (rule.minConfidence || 0) && confidence > bestMatch.confidence) {
        // Determine source of match
        let source: CategoryDetectionResult['source'] = 'multiple';
        const titleMatches = findMatchingKeywords(title, rule.keywords);
        const tagsMatches = findMatchingKeywords(tagsText, rule.keywords);
        const descMatches = findMatchingKeywords(description, rule.keywords);
        
        if (titleMatches.length > 0) source = 'title';
        else if (tagsMatches.length > 0) source = 'tags';
        else if (descMatches.length > 0) source = 'description';
        else if (findMatchingKeywords(handle, rule.keywords).length > 0) source = 'handle';
        else if (findMatchingKeywords(vendor, rule.keywords).length > 0) source = 'vendor';
        
        bestMatch = {
          category: rule.category,
          confidence,
          matchedKeywords,
          source
        };
        
        // If we found a very high confidence match, we can stop early
        if (confidence >= 90 && rule.priority >= 90) {
          break;
        }
      }
    }
  }
  
  return bestMatch;
}

/**
 * Batch detect categories for multiple products
 */
export function batchDetectCategories(products: Array<{
  title?: string;
  description?: string;
  tags?: string | string[];
  handle?: string;
  vendor?: string;
  type?: string;
}>): CategoryDetectionResult[] {
  return products.map(product => detectCategory(product));
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  return Array.from(new Set(CATEGORY_RULES.map(rule => rule.category)));
}

/**
 * Get category rules for a specific category
 */
export function getCategoryRules(category: string): CategoryRule | undefined {
  return CATEGORY_RULES.find(rule => rule.category === category);
}

/**
 * Add or update a category rule (for admin customization)
 */
export function addCategoryRule(rule: CategoryRule): void {
  const existingIndex = CATEGORY_RULES.findIndex(r => r.category === rule.category);
  
  if (existingIndex >= 0) {
    CATEGORY_RULES[existingIndex] = rule;
  } else {
    CATEGORY_RULES.push(rule);
  }
}

/**
 * Export for testing and debugging
 */
export const categoryDetectionUtils = {
  normalizeText,
  calculateConfidence,
  findMatchingKeywords
};
