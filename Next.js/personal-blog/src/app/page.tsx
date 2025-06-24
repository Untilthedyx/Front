'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArticleCard, ArticleCardSkeleton } from '@/components/ArticleCard'
import { Pagination } from '@/components/Pagination'
import { ErrorComponent } from '@/components/ui/ErrorComponent'
import { Article } from '@/lib/supabase'

interface ArticlesResponse {
  success: boolean
  data: Article[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const currentPage = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    fetchArticles(currentPage)
  }, [currentPage])

  const fetchArticles = async (page: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/articles?page=${page}&limit=10`)
      const result: ArticlesResponse = await response.json()
      
      if (result.success) {
        setArticles(result.data)
        setPagination(result.pagination)
      } else {
        setError(result.error || '获取文章失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    fetchArticles(currentPage)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">个人博客</h1>
          <p className="text-gray-600 mt-2">分享技术心得与生活感悟</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-6">
            <a href="/" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
              首页
            </a>
            <a href="/create" className="text-gray-600 hover:text-blue-600 transition-colors">
              写文章
            </a>
            <a href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
              关于
            </a>
          </div>
        </nav>

        {/* Articles Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">最新文章</h2>
            {!loading && !error && (
              <span className="text-sm text-gray-500">
                共 {pagination.total} 篇文章
              </span>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid gap-6">
              {[...Array(6)].map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <ErrorComponent message={error} onRetry={handleRetry} />
          )}

          {/* Articles List */}
          {!loading && !error && (
            <>
              {articles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无文章</h3>
                  <p className="text-gray-600 mb-4">还没有发布任何文章，快去创建第一篇文章吧！</p>
                  <a
                    href="/create"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    创建文章
                  </a>
                </div>
              ) : (
                <div className="grid gap-6">
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                basePath="/"
              />
            </>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 个人博客. 使用 Next.js 和 Supabase 构建.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
