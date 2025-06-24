-- 个人博客系统数据库初始化脚本
-- 在 Supabase SQL 编辑器中运行此脚本

-- 创建文章表
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}'
);

-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_name VARCHAR(100) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为文章表创建更新时间触发器
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 创建文章表的安全策略
-- 允许所有人查看已发布的文章
CREATE POLICY "Allow public read access to published articles" ON articles
  FOR SELECT USING (published = true);

-- 允许所有人创建文章（在实际应用中可能需要身份验证）
CREATE POLICY "Allow public insert access to articles" ON articles
  FOR INSERT WITH CHECK (true);

-- 允许所有人更新文章（在实际应用中可能需要身份验证）
CREATE POLICY "Allow public update access to articles" ON articles
  FOR UPDATE USING (true);

-- 允许所有人删除文章（在实际应用中可能需要身份验证）
CREATE POLICY "Allow public delete access to articles" ON articles
  FOR DELETE USING (true);

-- 创建评论表的安全策略
-- 允许所有人查看评论
CREATE POLICY "Allow public read access to comments" ON comments
  FOR SELECT USING (true);

-- 允许所有人创建评论
CREATE POLICY "Allow public insert access to comments" ON comments
  FOR INSERT WITH CHECK (true);

-- 插入示例数据
INSERT INTO articles (title, slug, content, excerpt, published, tags) VALUES
(
  '欢迎来到我的博客',
  'welcome-to-my-blog',
  '# 欢迎来到我的博客

这是我的第一篇博客文章！在这里，我将分享我的技术学习心得、项目经验以及一些有趣的想法。

## 关于这个博客

这个博客是使用以下技术栈构建的：

- **Next.js 14** - React 框架，支持 SSG 和 ISR
- **Supabase** - 开源的 Firebase 替代品
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架

## 功能特性

- ✅ 文章列表和详情页
- ✅ Markdown 内容渲染
- ✅ 评论系统
- ✅ 标签分类
- ✅ 响应式设计
- ✅ SEO 优化

希望你喜欢这个博客！',
  '欢迎来到我的个人博客！这里将分享技术心得、项目经验和有趣的想法。',
  true,
  ARRAY['欢迎', '博客', 'Next.js', 'Supabase']
),
(
  'Next.js 14 新特性详解',
  'nextjs-14-new-features',
  '# Next.js 14 新特性详解

Next.js 14 带来了许多令人兴奋的新特性和改进。让我们一起来看看这些更新如何提升我们的开发体验。

## App Router 稳定版

App Router 现在已经稳定，提供了更好的性能和开发体验：

```javascript
// app/page.tsx
export default function Page() {
  return <h1>Hello, Next.js 14!</h1>
}
```

## Server Actions

Server Actions 让我们可以直接在组件中编写服务器端逻辑：

```javascript
async function createPost(formData) {
  "use server"
  
  const title = formData.get("title")
  // 处理表单数据
}
```

## 性能优化

- 更快的本地开发服务器
- 改进的内存使用
- 更好的 Tree Shaking

这些特性让 Next.js 14 成为构建现代 Web 应用的绝佳选择！',
  'Next.js 14 带来了 App Router 稳定版、Server Actions 等新特性，大幅提升开发体验和应用性能。',
  true,
  ARRAY['Next.js', 'React', '前端开发', 'Web开发']
),
(
  'Supabase 入门指南',
  'supabase-getting-started',
  '# Supabase 入门指南

Supabase 是一个开源的 Firebase 替代品，提供了数据库、身份验证、实时订阅等功能。

## 什么是 Supabase？

Supabase 基于 PostgreSQL，提供：

- 🗄️ 数据库：PostgreSQL 数据库
- 🔐 身份验证：用户管理和身份验证
- 📡 实时：实时数据订阅
- 🗂️ 存储：文件存储
- 🔧 Edge Functions：服务器端函数

## 快速开始

### 1. 安装客户端

```bash
npm install @supabase/supabase-js
```

### 2. 初始化客户端

```javascript
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "YOUR_SUPABASE_URL"
const supabaseKey = "YOUR_SUPABASE_ANON_KEY"

const supabase = createClient(supabaseUrl, supabaseKey)
```

### 3. 查询数据

```javascript
const { data, error } = await supabase
  .from("articles")
  .select("*")
```

## 总结

Supabase 为现代应用开发提供了强大而简单的后端解决方案，特别适合与 Next.js 等前端框架配合使用。',
  'Supabase 是开源的 Firebase 替代品，提供数据库、身份验证、实时订阅等功能，是现代应用的理想后端解决方案。',
  true,
  ARRAY['Supabase', '数据库', '后端开发', 'PostgreSQL']
);

-- 插入示例评论
INSERT INTO comments (article_id, author_name, author_email, content)
SELECT 
  a.id,
  '张三',
  'zhangsan@example.com',
  '很棒的文章！学到了很多新知识。'
FROM articles a WHERE a.slug = 'welcome-to-my-blog'
LIMIT 1;

INSERT INTO comments (article_id, author_name, author_email, content)
SELECT 
  a.id,
  '李四',
  'lisi@example.com',
  'Next.js 14 的新特性确实很实用，期待更多相关内容！'
FROM articles a WHERE a.slug = 'nextjs-14-new-features'
LIMIT 1;

-- 完成初始化
SELECT 'Database initialization completed successfully!' as status;