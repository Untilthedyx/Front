import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据库类型定义
export interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  author_id?: string
  created_at: string
  updated_at: string
  published: boolean
  tags?: string[]
}

export interface Comment {
  id: string
  article_id: string
  author_name: string
  author_email: string
  content: string
  created_at: string
}

// 文章相关API函数
export async function getArticles(page = 1, limit = 10) {
  const start = (page - 1) * limit
  const end = start + limit - 1

  const { data, error, count } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, created_at, tags', { count: 'exact' })
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw new Error('Failed to fetch articles')
  return { articles: data, total: count }
}

export async function getArticleBySlug(slug: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error) throw new Error('Failed to fetch article')
  return data
}

export async function createArticle(articleData: Omit<Article, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('articles')
    .insert([{
      ...articleData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw new Error('Failed to create article')
  return data
}

export async function updateArticle(id: string, articleData: Partial<Article>) {
  const { data, error } = await supabase
    .from('articles')
    .update({
      ...articleData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error('Failed to update article')
  return data
}

export async function deleteArticle(id: string) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Failed to delete article')
}

// 评论相关API函数
export async function getCommentsByArticleId(articleId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true })

  if (error) throw new Error('Failed to fetch comments')
  return data
}

export async function createComment(commentData: Omit<Comment, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('comments')
    .insert([{
      ...commentData,
      created_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw new Error('Failed to create comment')
  return data
}