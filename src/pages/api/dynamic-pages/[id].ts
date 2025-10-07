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

  const { id } = req.query as { id: string }

  try {
    if (req.method === 'GET') {
      const dynamicPage = await prisma.dynamicPage.findUnique({
        where: { id }
      })
      
      if (!dynamicPage) {
        return res.status(404).json({ error: 'Dynamic page not found' })
      }
      
      return res.json(dynamicPage)
    }

    if (req.method === 'PUT') {
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
        isActive,
        sortOrder
      } = req.body

      const updateData: any = {}
      
      // Only update fields that are provided
      if (section !== undefined) updateData.section = section as DynamicPageSection
      if (title !== undefined) updateData.title = title
      if (subtitle !== undefined) updateData.subtitle = subtitle
      if (description !== undefined) updateData.description = description
      if (buttonText !== undefined) updateData.buttonText = buttonText
      if (desktopImage !== undefined) updateData.desktopImage = desktopImage
      if (mobileImage !== undefined) updateData.mobileImage = mobileImage
      if (image !== undefined) updateData.image = image
      if (videoSource !== undefined) updateData.videoSource = videoSource
      if (paragraph1 !== undefined) updateData.paragraph1 = paragraph1
      if (paragraph2 !== undefined) updateData.paragraph2 = paragraph2
      if (designerImage !== undefined) updateData.designerImage = designerImage
      if (designerQuote !== undefined) updateData.designerQuote = designerQuote
      if (bannerImage !== undefined) updateData.bannerImage = bannerImage
      if (interiorImage !== undefined) updateData.interiorImage = interiorImage
      if (paragraphTexts !== undefined) updateData.paragraphTexts = paragraphTexts
      if (metaData !== undefined) updateData.metaData = metaData
      if (isActive !== undefined) updateData.isActive = isActive
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder

      const dynamicPage = await prisma.dynamicPage.update({
        where: { id },
        data: updateData
      })

      return res.json(dynamicPage)
    }

    if (req.method === 'DELETE') {
      await prisma.dynamicPage.delete({
        where: { id }
      })

      return res.status(204).end()
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err: any) {
    console.error('Dynamic Page API Error:', err)
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Dynamic page not found' })
    }
    
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
