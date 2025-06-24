import { NextRequest, NextResponse } from 'next/server'
import { getCommentsByArticleId, createComment } from '@/lib/supabase'

// GET /api/comments?articleId=xxx - 获取文章评论
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('articleId')

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      )
    }

    const comments = await getCommentsByArticleId(articleId)
    
    return NextResponse.json({
      success: true,
      data: comments
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST /api/comments - 创建新评论
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { article_id, author_name, author_email, content } = body

    if (!article_id || !author_name || !author_email || !content) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    // 简单的邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(author_email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const commentData = {
      article_id,
      author_name,
      author_email,
      content
    }

    const comment = await createComment(commentData)
    
    return NextResponse.json({
      success: true,
      data: comment
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}