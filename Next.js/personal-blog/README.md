# 个人博客系统 📝

一个基于 Next.js 15 和 Supabase 构建的现代化个人博客系统，支持文章管理、评论系统、标签分类等功能。

## ✨ 功能特性

### 核心功能
- 📖 **文章管理** - 创建、编辑、删除文章
- 📝 **Markdown 支持** - 完整的 Markdown 语法支持，包括 GitHub 风格扩展
- 💬 **评论系统** - 实时评论功能
- 🏷️ **标签分类** - 文章标签管理和分类
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🔍 **SEO 优化** - 动态元数据生成，搜索引擎友好

### 技术特性
- ⚡ **ISR 增量静态再生** - 提供最佳性能体验
- 🔄 **SWR 数据获取** - 智能缓存和实时更新
- 🎨 **现代化 UI** - 基于 Tailwind CSS 的精美界面
- 🔒 **类型安全** - 完整的 TypeScript 支持
- 📊 **性能优化** - 代码分割、懒加载等优化策略

## 🛠️ 技术栈

- **前端框架**: Next.js 15 (App Router)
- **开发语言**: TypeScript
- **样式框架**: Tailwind CSS 4
- **数据库**: Supabase (PostgreSQL)
- **数据获取**: SWR
- **Markdown 渲染**: react-markdown + remark-gfm
- **部署平台**: Vercel (推荐)

## 🚀 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- npm、yarn、pnpm 或 bun

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd personal-blog
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 3. 配置环境变量

复制 `.env.local` 文件并填入您的 Supabase 配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 初始化数据库

在 Supabase Dashboard 的 SQL Editor 中执行 `database/init.sql` 脚本：

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 进入 **SQL Editor**
4. 复制并执行 `database/init.sql` 中的所有内容

### 5. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看您的博客。

## 📁 项目结构

```
personal-blog/
├── src/
│   ├── app/                 # App Router 页面
│   │   ├── api/            # API 路由
│   │   ├── articles/       # 文章相关页面
│   │   ├── create/         # 文章创建页面
│   │   └── about/          # 关于页面
│   ├── components/         # React 组件
│   │   ├── ui/            # UI 基础组件
│   │   ├── ArticleCard.tsx
│   │   ├── Comments.tsx
│   │   └── Pagination.tsx
│   └── lib/               # 工具函数和配置
│       └── supabase.ts    # Supabase 客户端配置
├── database/
│   └── init.sql           # 数据库初始化脚本
├── public/                # 静态资源
└── ...
```

## 🎯 主要页面

- **首页** (`/`) - 文章列表，支持分页
- **文章详情** (`/articles/[slug]`) - 文章内容和评论
- **创建文章** (`/create`) - 文章编辑器，支持 Markdown 预览
- **关于页面** (`/about`) - 个人介绍

## 🔧 可用脚本

```bash
# 开发模式（使用 Turbopack）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
```

## 📊 性能优化

- **ISR (增量静态再生)**: 文章详情页每小时重新验证
- **SWR 缓存**: 智能数据缓存和后台更新
- **代码分割**: 自动代码分割和懒加载
- **图片优化**: Next.js 内置图片优化
- **字体优化**: 使用 `next/font` 优化字体加载

## 🚀 部署

### Vercel 部署（推荐）

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量
4. 自动部署完成

### 其他平台

项目支持部署到任何支持 Node.js 的平台，如 Netlify、Railway 等。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [SWR 文档](https://swr.vercel.app)

---

如果这个项目对您有帮助，请给个 ⭐ Star！
