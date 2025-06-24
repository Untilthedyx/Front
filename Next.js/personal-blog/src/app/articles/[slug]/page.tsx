import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { getArticleBySlug } from '@/lib/supabase'
import { Comments } from '@/components/Comments'
import Link from 'next/link'

interface ArticlePageProps {
  params: {
    slug: string
  }
}

// 生成页面元数据
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  try {
    const article = await getArticleBySlug(params.slug)
    
    return {
      title: `${article.title} | 个人博客`,
      description: article.excerpt || article.content.substring(0, 160),
      keywords: article.tags?.join(', '),
      openGraph: {
        title: article.title,
        description: article.excerpt || article.content.substring(0, 160),
        type: 'article',
        publishedTime: article.created_at,
        modifiedTime: article.updated_at,
        tags: article.tags,
      },
    }
  } catch (error) {
    return {
      title: '文章未找到 | 个人博客',
      description: '您访问的文章不存在或已被删除。',
    }
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  let article
  
  try {
    article = await getArticleBySlug(params.slug)
  } catch (error) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <nav className="mb-4">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← 返回首页
            </Link>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">个人博客</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Article Header */}
          <header className="p-8 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <time>
                  发布于 {format(new Date(article.created_at), 'yyyy年MM月dd日', { locale: zhCN })}
                </time>
                {article.updated_at !== article.created_at && (
                  <time>
                    更新于 {format(new Date(article.updated_at), 'yyyy年MM月dd日', { locale: zhCN })}
                  </time>
                )}
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                约 {Math.ceil(article.content.length / 500)} 分钟阅读
              </div>
            </div>
            
            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>
          
          {/* Article Content */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // 自定义渲染组件
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className
                    if (isInline) {
                      return (
                        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm">
                          {children}
                        </code>
                      )
                    }
                    return (
                      <code className={`block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto ${className}`}>
                        {children}
                      </code>
                    )
                  },
                  pre: ({ children }) => (
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700">
                      {children}
                    </li>
                  ),
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      className="text-blue-600 hover:text-blue-800 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>
          </div>
        </article>
        
        {/* Comments Section */}
        <Comments articleId={article.id} />
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

// 启用 ISR (增量静态再生)
export const revalidate = 3600 // 1小时重新验证一次