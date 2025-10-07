import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const listPages = async ({ q, take = 50, skip = 0 }: { q?: string; take?: number; skip?: number }) => {
  const limit = Math.min(Number(take || 50), 200)
  const offset = Math.max(Number(skip || 0), 0)
  const where = q
    ? {
        OR: [
          { title: { contains: String(q), mode: 'insensitive' as const } },
          { slug: { contains: String(q), mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [data, total] = await Promise.all([
    prisma.page.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit, skip: offset }),
    prisma.page.count({ where }),
  ])

  return { data, total }
}

export const getPageById = async (id: string) => {
  return prisma.page.findUnique({ where: { id } })
}

export const getPageBySlug = async (slug: string) => {
  return prisma.page.findUnique({ where: { slug } })
}

const createSchema = z.object({ title: z.string().min(1), slug: z.string().min(1).regex(slugPattern), content: z.any().optional(), status: z.enum(['Draft', 'Published']).optional() })

export const createPage = async (payload: any) => {
  const parsed = createSchema.parse({ title: payload.title, slug: payload.slug, content: payload.content, status: payload.status })

  const existing = await prisma.page.findUnique({ where: { slug: parsed.slug } })
  if (existing) throw new Error('slug_exists')

  // Reject embedded data URLs
  const payloadStr = JSON.stringify(payload || '')
  if (payloadStr.includes('data:')) throw new Error('embedded_data')

  const created = await prisma.page.create({ data: { title: parsed.title.trim(), slug: parsed.slug.trim(), content: parsed.content ?? {}, status: parsed.status ?? 'Draft' } })
  return created
}

const updateSchema = z.object({ title: z.string().min(1).optional(), slug: z.string().min(1).regex(slugPattern).optional(), content: z.any().optional(), status: z.enum(['Draft', 'Published']).optional() })

export const updatePage = async (id: string, payload: any) => {
  const parsed = updateSchema.parse(payload)

  if (parsed.slug) {
    const existing = await prisma.page.findUnique({ where: { slug: parsed.slug } })
    if (existing && existing.id !== id) throw new Error('slug_exists')
  }

  const payloadStr = JSON.stringify(payload || '')
  if (payloadStr.includes('data:')) throw new Error('embedded_data')

  const updated = await prisma.page.update({ where: { id }, data: { ...parsed } })
  return updated
}

export const deletePage = async (id: string) => {
  return prisma.page.delete({ where: { id } })
}

export default {
  listPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
}
