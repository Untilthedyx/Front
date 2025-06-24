import { NextRequest, NextResponse } from 'next/server'
import { getArticleBySlug, updateArticle, deleteArticle } from '@/lib/supabase'

interface RouteParams {
  params: {
    slug: string
  }
}

// GET /api/articles/[slug] - 获取单个文章
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const article = await getArticleBySlug(params.slug)
    
    return NextResponse.json({
      success: true,
      data: article
    })
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { success: false, error: 'Article not found' },
      { status: 404 }
    )
  }
}

// PUT /api/articles/[slug] - 更新文章
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { title, content, excerpt, tags, published } = body

    // 首先获取现有文章以获得ID
    const existingArticle = await getArticleBySlug(params.slug)
    
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (excerpt !== undefined) updateData.excerpt = excerpt
    if (tags !== undefined) updateData.tags = tags
    if (published !== undefined) updateData.published = published

    // 如果标题改变了，更新slug
    if (title && title !== existingArticle.title) {
      updateData.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim()
    }

    const article = await updateArticle(existingArticle.id, updateData)
    
    return NextResponse.json({
      success: true,
      data: article
    })
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

// DELETE /api/articles/[slug] - 删除文章
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 首先获取现有文章以获得ID
    const existingArticle = await getArticleBySlug(params.slug)
    
    await deleteArticle(existingArticle.id)
    
    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}