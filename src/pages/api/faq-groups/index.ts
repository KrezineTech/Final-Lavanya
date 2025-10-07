import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

// Enhanced FAQ schema with group management
const createFaqGroupSchema = z.object({
  groupTitle: z.string().min(1, 'Group title is required'),
  isVisible: z.boolean().default(true),
  order: z.number().default(0),
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required')
  })).min(1, 'At least one FAQ is required'),
})

const updateFaqGroupSchema = z.object({
  groupTitle: z.string().min(1, 'Group title is required').optional(),
  isVisible: z.boolean().optional(),
  order: z.number().optional(),
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required')
  })).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      // Get all FAQ groups ordered by sequence
      const faqPages = await prisma.dynamicPage.findMany({
        where: {
          section: 'SHARED_FAQ_HEADER'
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      // Transform to new group format
      const faqGroups = faqPages.map(page => {
        const metaData = page.metaData as any
        const faqData = metaData?.faqData || {}
        
        // Handle legacy format and new format
        let faqs: Array<{question: string, answer: string}> = []
        
        if (faqData.items && Array.isArray(faqData.items)) {
          // New format with items array
          faqs = faqData.items
        } else if (faqData.question && faqData.answer) {
          // Legacy single Q&A format
          faqs = [{ question: faqData.question, answer: faqData.answer }]
        } else if (faqData.faqs && Array.isArray(faqData.faqs)) {
          // Enhanced group format
          faqs = faqData.faqs
        }

        return {
          id: page.id,
          groupTitle: faqData.groupTitle || faqData.title || page.title || 'Untitled Group',
          isVisible: faqData.isVisible !== undefined ? faqData.isVisible : page.isActive,
          order: faqData.order !== undefined ? faqData.order : page.sortOrder,
          faqs: faqs,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt
        }
      })

      // Sort by order field
      faqGroups.sort((a, b) => a.order - b.order)

      return res.status(200).json(faqGroups)
    }

    if (req.method === 'POST') {
      const validatedData = createFaqGroupSchema.parse(req.body)

      // Check for duplicate group title
      const existingPages = await prisma.dynamicPage.findMany({
        where: {
          section: 'SHARED_FAQ_HEADER'
        }
      })

      const existingGroup = existingPages.find(page => {
        if (page.metaData && typeof page.metaData === 'object') {
          const metaData = page.metaData as any
          const groupTitle = metaData.faqData?.groupTitle || metaData.faqData?.title || page.title
          return groupTitle?.toLowerCase() === validatedData.groupTitle.toLowerCase()
        }
        return false
      })

      if (existingGroup) {
        return res.status(400).json({ 
          error: 'A FAQ group with this title already exists' 
        })
      }

      // Create new FAQ group
      const faqPage = await prisma.dynamicPage.create({
        data: {
          section: 'SHARED_FAQ_HEADER',
          title: validatedData.groupTitle,
          description: `FAQ group: ${validatedData.groupTitle} with ${validatedData.faqs.length} questions`,
          isActive: validatedData.isVisible,
          sortOrder: validatedData.order,
          metaData: {
            faqData: {
              groupTitle: validatedData.groupTitle, // New format
              title: validatedData.groupTitle, // Old format for backward compatibility
              faqs: validatedData.faqs, // New format
              items: validatedData.faqs, // Old format for backward compatibility
              isVisible: validatedData.isVisible,
              order: validatedData.order
            }
          }
        }
      })

      const response = {
        id: faqPage.id,
        groupTitle: validatedData.groupTitle,
        isVisible: validatedData.isVisible,
        order: validatedData.order,
        faqs: validatedData.faqs,
        createdAt: faqPage.createdAt,
        updatedAt: faqPage.updatedAt
      }

      return res.status(201).json(response)
    }

    return res.status(405).json({ error: 'Method not allowed' })
    
  } catch (err: any) {
    console.error('FAQ Groups API Error:', err)
    
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: err.errors 
      })
    }

    return res.status(500).json({ 
      error: err.message || 'Internal server error' 
    })
  }
}
