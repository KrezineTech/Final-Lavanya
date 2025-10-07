import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid FAQ group ID' })
  }

  try {
    if (req.method === 'GET') {
      // Get specific FAQ group
      const faqPage = await prisma.dynamicPage.findUnique({
        where: {
          id: id,
          section: 'SHARED_FAQ_HEADER'
        }
      })

      if (!faqPage) {
        return res.status(404).json({ error: 'FAQ group not found' })
      }

      const metaData = faqPage.metaData as any
      const faqData = metaData?.faqData || {}
      
      // Handle different formats
      let faqs: Array<{question: string, answer: string}> = []
      
      if (faqData.items && Array.isArray(faqData.items)) {
        // Legacy items format
        faqs = faqData.items
      } else if (faqData.question && faqData.answer) {
        // Legacy single Q&A format
        faqs = [{ question: faqData.question, answer: faqData.answer }]
      } else if (faqData.faqs && Array.isArray(faqData.faqs)) {
        // New group format
        faqs = faqData.faqs
      }

      const response = {
        id: faqPage.id,
        groupTitle: faqData.groupTitle || faqData.title || faqPage.title || 'Untitled Group',
        isVisible: faqData.isVisible !== undefined ? faqData.isVisible : faqPage.isActive,
        order: faqData.order !== undefined ? faqData.order : faqPage.sortOrder,
        faqs: faqs,
        createdAt: faqPage.createdAt,
        updatedAt: faqPage.updatedAt
      }

      return res.status(200).json(response)
    }

    if (req.method === 'PUT') {
      const validatedData = updateFaqGroupSchema.parse(req.body)

      // Check if FAQ group exists
      const existingPage = await prisma.dynamicPage.findUnique({
        where: {
          id: id,
          section: 'SHARED_FAQ_HEADER'
        }
      })

      if (!existingPage) {
        return res.status(404).json({ error: 'FAQ group not found' })
      }

      // Check for duplicate group title (if title is being changed)
      if (validatedData.groupTitle) {
        const duplicateCheck = await prisma.dynamicPage.findMany({
          where: {
            section: 'SHARED_FAQ_HEADER',
            id: { not: id }
          }
        })

        const duplicate = duplicateCheck.find((page: any) => {
          if (page.metaData && typeof page.metaData === 'object') {
            const metaData = page.metaData as any
            const groupTitle = metaData.faqData?.groupTitle || metaData.faqData?.title || page.title
            return groupTitle?.toLowerCase() === validatedData.groupTitle?.toLowerCase()
          }
          return false
        })

        if (duplicate) {
          return res.status(400).json({ 
            error: 'A FAQ group with this title already exists' 
          })
        }
      }

      // Get current metadata
      const currentMetaData = existingPage.metaData as any
      const currentFaqData = currentMetaData?.faqData || {}

      // Merge updates with existing data
      const updatedFaqData = {
        ...currentFaqData,
        ...(validatedData.groupTitle && { 
          groupTitle: validatedData.groupTitle,
          title: validatedData.groupTitle // Keep both for compatibility
        }),
        ...(validatedData.isVisible !== undefined && { isVisible: validatedData.isVisible }),
        ...(validatedData.order !== undefined && { order: validatedData.order }),
        ...(validatedData.faqs && { 
          faqs: validatedData.faqs,
          items: validatedData.faqs // Keep both for compatibility
        })
      }

      // Update the page
      const updatedPage = await prisma.dynamicPage.update({
        where: { id },
        data: {
          ...(validatedData.groupTitle && { title: validatedData.groupTitle }),
          ...(validatedData.isVisible !== undefined && { isActive: validatedData.isVisible }),
          ...(validatedData.order !== undefined && { sortOrder: validatedData.order }),
          metaData: {
            faqData: updatedFaqData
          },
          ...(validatedData.faqs && { 
            description: `FAQ group: ${updatedFaqData.groupTitle} with ${validatedData.faqs.length} questions` 
          })
        }
      })

      const response = {
        id: updatedPage.id,
        groupTitle: updatedFaqData.groupTitle,
        isVisible: updatedFaqData.isVisible,
        order: updatedFaqData.order,
        faqs: updatedFaqData.faqs,
        createdAt: updatedPage.createdAt,
        updatedAt: updatedPage.updatedAt
      }

      return res.status(200).json(response)
    }

    if (req.method === 'DELETE') {
      // Check if FAQ group exists
      const existingPage = await prisma.dynamicPage.findUnique({
        where: {
          id: id,
          section: 'SHARED_FAQ_HEADER'
        }
      })

      if (!existingPage) {
        return res.status(404).json({ error: 'FAQ group not found' })
      }

      // Delete the FAQ group
      await prisma.dynamicPage.delete({
        where: { id }
      })

      return res.status(200).json({ message: 'FAQ group deleted successfully' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
    
  } catch (err: any) {
    console.error('FAQ Group API Error:', err)
    
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
