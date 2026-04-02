import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://docflow.ai'

  const routes = [
    '',
    '/ai-summarize',
    '/chat-with-pdf',
    '/compress-pdf',
    '/image-to-pdf',
    '/merge-pdf',
    '/pdf-to-image',
    '/pdf-to-word',
    '/translate-pdf',
    '/word-to-pdf',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}
