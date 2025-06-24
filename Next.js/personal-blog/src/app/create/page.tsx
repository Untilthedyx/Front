'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateArticlePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: '',
    published: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const articleData = {
        ...formData,
        tags: tagsArray,
        excerpt: formData.excerpt || formData.content.substring(0, 200) + '...'
      }

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData)
      })

      const result = await response.json()
      
      if (result.success) {
        router.push(`/articles/${result.data.slug}`)
      } else {
        alert(result.error || '创建文章失败')
      }
    } catch (error) {
      console.error('Failed to create article:', error)
      alert('创建文章失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-900">创建新文章</h1>
          <p className="text-gray-600 mt-2">分享你的想法和见解</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setPreview(false)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  !preview
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                编辑
              </button>
              <button
                onClick={() => setPreview(true)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  preview
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                预览
              </button>
            </nav>
          </div>

          {!preview ? (
            /* Edit Form */
            <form onSubmit={handleSubmit} className="p-6">
              {/* Title */}
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  文章标题 *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入文章标题"
                />
              </div>

              {/* Excerpt */}
              <div className="mb-6">
                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                  文章摘要
                </label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入文章摘要（可选，如不填写将自动生成）"
                />
              </div>

              {/* Tags */}
              <div className="mb-6">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入标签，多个标签用逗号分隔"
                />
                <p className="text-sm text-gray-500 mt-1">
                  例如：技术, React, Next.js
                </p>
              </div>

              {/* Content */}
              <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  文章内容 * (支持 Markdown)
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="请输入文章内容，支持 Markdown 语法..."
                />
              </div>

              {/* Published */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="published"
                    checked={formData.published}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    立即发布（取消勾选将保存为草稿）
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </Link>
                
                <button
                  type="submit"
                  disabled={submitting || !formData.title || !formData.content}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? '创建中...' : (formData.published ? '发布文章' : '保存草稿')}
                </button>
              </div>
            </form>
          ) : (
            /* Preview */
            <div className="p-6">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {formData.title || '文章标题'}
                </h1>
                
                {formData.excerpt && (
                  <p className="text-gray-600 mb-4">
                    {formData.excerpt}
                  </p>
                )}
                
                {formData.tags && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.split(',').map((tag, index) => {
                      const trimmedTag = tag.trim()
                      if (!trimmedTag) return null
                      return (
                        <span
                          key={index}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                        >
                          {trimmedTag}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
              
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {formData.content || '文章内容将在这里显示...'}
                </div>
              </div>
            </div>
          )}
        </div>
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