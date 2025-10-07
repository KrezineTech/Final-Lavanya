import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

const updateFaqSchema = z.object({
  title: z.string().min(1).optional(),
  items: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required')
  })).optional(),
  sortOrder: z.number().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow basic CORS for development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'FAQ ID is required' })
  }

  try {
    if (req.method === 'GET') {
      // Get FAQ by ID from dynamic pages
      const faqPage = await prisma.dynamicPage.findUnique({
        where: { id },
      })

      if (!faqPage || faqPage.section !== 'SHARED_FAQ_HEADER') {
        return res.status(404).json({ error: 'FAQ not found' })
      }

      // Extract FAQ data from metaData
      if (faqPage.metaData && typeof faqPage.metaData === 'object') {
        const metaData = faqPage.metaData as any
        if (metaData.faqData) {
          // Support both groupTitle and title
          const faqTitle = metaData.faqData.groupTitle || metaData.faqData.title || faqPage.title || 'Untitled'
          // Support both faqs and items arrays
          const faqItems = metaData.faqData.faqs || metaData.faqData.items || []
          // Support isVisible from metaData or page level
          const isVisible = metaData.faqData.isVisible !== undefined 
            ? metaData.faqData.isVisible 
            : faqPage.isActive
          
          const response = {
            id: faqPage.id,
            title: faqTitle,
            items: faqItems,
            sortOrder: faqPage.sortOrder,
            isActive: isVisible,
            createdAt: faqPage.createdAt,
            updatedAt: faqPage.updatedAt
          }
          
          // Handle legacy format with single question/answer
          if (!faqItems.length && metaData.faqData.question && metaData.faqData.answer) {
            response.items = [{
              question: metaData.faqData.question,
              answer: metaData.faqData.answer
            }]
          }
          
          return res.status(200).json(response)
        }
      }

      return res.status(404).json({ error: 'FAQ data not found' })
    }

    if (req.method === 'PUT') {
      const validatedData = updateFaqSchema.parse(req.body)

      // Get current FAQ page
      const currentPage = await prisma.dynamicPage.findUnique({
        where: { id }
      })

      if (!currentPage || currentPage.section !== 'SHARED_FAQ_HEADER') {
        return res.status(404).json({ error: 'FAQ not found' })
      }

      // Check for duplicate title if title is being changed
      if (validatedData.title) {
        const existingPages = await prisma.dynamicPage.findMany({
          where: {
            section: 'SHARED_FAQ_HEADER',
            id: { not: id }
          }
        })

        const duplicateTitle = existingPages.find(page => {
          if (page.metaData && typeof page.metaData === 'object') {
            const metaData = page.metaData as any
            const existingTitle = metaData.faqData?.groupTitle || metaData.faqData?.title
            return metaData.faqData && 
                   existingTitle?.toLowerCase() === validatedData.title?.toLowerCase()
          }
          return false
        })

        if (duplicateTitle) {
          return res.status(400).json({ 
            error: 'A FAQ group with this title already exists' 
          })
        }
      }

      // Get current FAQ data
      const currentMetaData = currentPage.metaData as any
      const currentFaqData = currentMetaData?.faqData || {}
      
      // Get current title from either groupTitle or title field
      const currentTitle = currentFaqData.groupTitle || currentFaqData.title || currentPage.title
      const currentItems = currentFaqData.faqs || currentFaqData.items || []

      // Update the FAQ page with both new and old format for compatibility
      const updatedPage = await prisma.dynamicPage.update({
        where: { id },
        data: {
          title: validatedData.title || currentTitle,
          description: validatedData.items ? `FAQ group with ${validatedData.items.length} items` : currentPage.description,
          sortOrder: validatedData.sortOrder !== undefined ? validatedData.sortOrder : currentPage.sortOrder,
          isActive: true, // Keep page active
          metaData: {
            faqData: {
              groupTitle: validatedData.title || currentTitle, // New format
              title: validatedData.title || currentTitle, // Old format for compatibility
              faqs: validatedData.items || currentItems, // New format
              items: validatedData.items || currentItems, // Old format for compatibility
              isVisible: true, // FAQs are visible when updated
              order: validatedData.sortOrder !== undefined ? validatedData.sortOrder : currentPage.sortOrder
            }
          }
        }
      })

      // Return updated FAQ
      const response = {
        id: updatedPage.id,
        title: validatedData.title || currentTitle,
        items: validatedData.items || currentItems,
        sortOrder: updatedPage.sortOrder,
        isActive: true,
        updatedAt: updatedPage.updatedAt
      }

      return res.status(200).json(response)
    }

    if (req.method === 'DELETE') {
      // Delete FAQ page
      await prisma.dynamicPage.delete({
        where: { id }
      })

      return res.status(200).json({ message: 'FAQ deleted successfully' })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('FAQ API Error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors
      })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
}
