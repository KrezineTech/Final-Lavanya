import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { DynamicPageSection } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    if (req.method === 'GET') {
      const { section } = req.query as { section?: string }
      
      const where = section ? { section: section as DynamicPageSection } : {}
      
      const dynamicPages = await prisma.dynamicPage.findMany({
        where,
        orderBy: [
          { section: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      })
      
      return res.json(dynamicPages)
    }

    if (req.method === 'POST') {
      const {
        section,
        title,
        subtitle,
        description,
        buttonText,
        desktopImage,
        mobileImage,
        image,
        videoSource,
        paragraph1,
        paragraph2,
        designerImage,
        designerQuote,
        bannerImage,
        interiorImage,
        paragraphTexts,
        metaData,
        isActive = true,
        sortOrder = 0
      } = req.body

      if (!section) {
        return res.status(400).json({ error: 'Section is required' })
      }

      const dynamicPage = await prisma.dynamicPage.create({
        data: {
          section: section as DynamicPageSection,
          title,
          subtitle,
          description,
          buttonText,
          desktopImage,
          mobileImage,
          image,
          videoSource,
          paragraph1,
          paragraph2,
          designerImage,
          designerQuote,
          bannerImage,
          interiorImage,
          paragraphTexts,
          metaData,
          isActive,
          sortOrder
        }
      })

      return res.status(201).json(dynamicPage)
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error('Dynamic Pages API Error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
