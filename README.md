# iExam - MockExamApp (Web 版本)

这是一个基于 **Next.js (App Router)** 框架和 **Supabase** 后端服务的现代化 Web 模拟考试应用。作为原版 UniApp 的高级重构版本，本项目在保持原有所有特色功能（多组织架构、动态题库、错题本、Excel 导入）的基础上，全面拥抱了 React Server Components (RSC) 并深度优化了 Vercel 部署支持。

## 技术栈 (Tech Stack)

*   **核心框架**: [Next.js](https://nextjs.org/) (App Router, React 18+)
*   **后端服务**: [Supabase](https://supabase.com/) (`@supabase/ssr`, PostgreSQL, Auth, RLS)
*   **UI 框架**: Tailwind CSS
*   **数据处理**: `xlsx` (SheetJS) 用于 Excel 后端/前端解析交互
*   **开发语言**: TypeScript
*   **部署平台**: 针对 [Vercel](https://vercel.com/) 深度优化

## 主要重构提升 (Key Improvements)

1.  **Server Actions 安全鉴权**: 彻底移除了容易暴露状态的客户端登录态管理，所有鉴权、Cookie 校验均在服务端和中间件（Middleware）完成。
2.  **更优的 SSR 和响应式**: 得益于 Next.js 和 Tailwind CSS，实现了从手机端到桌面的无缝响应式体验（移动端友好的大触控区域、Desktop 端的极简导航）。
3.  **高级搜索与路由参数**: 考试引擎深度集成 URL `searchParams`，以参数化驱动练习模式 (`mode=show`) 和考试模式 (`mode=hide`)，支持灵活分享和指定练习条件。
4.  **Edge / Serverless 完美兼容**: 弃用了原版的非标组件库，纯原生 Web 技术栈让整个应用可以在 Vercel 等平台做到零冷启动时间的极速部署。

## 功能模块 (Functionality)

### 1. 客户端 (Client)
*   **多组织支持与主动加入**: 用户不仅可以切换自己的组织，还可在首页发现并主动加入允许搜索的公开组织。
*   **智能考试引擎 (ExamEngine)**:
    *   **题量与题型约束**: 支持单选、多选、判断题，可通过表单自主定制练习数量。
    *   **练习/考试双模式**: 
        *   练习模式下，确认选项后立即核对并展示详尽解析。
        *   考试模式下，屏蔽任何答案与解析提示，最后交卷统一算分。
*   **错题本引擎 (MistakeEngine)**:
    *   **自动收录与剔除**: 错题实时入库，重新答对后自动移出错题本。
*   **响应式布局**: 在任何设备上都有优异的表现。

### 2. 管理后台 (Admin Portal)
基于 SSR 进行强权限校验（非 admin 账号强行访问会触发 404 或拦截回首页）。
*   **组织管理**: 创建/编辑组织，并在独立的抽屉模态框中二次管理该组织的“人员名单”和“生效题库”。
*   **题库管理**:
    *   **Excel 智能导入**: 支持客户端选择 `.xlsx` 文件直传解析，按特定表头格式快速构建题库。
    *   **状态启停**: 随时可将题库拉黑或启用（直接影响所有前端考生的可用试题池）。
*   **用户管理**: 封禁或激活用户账户。

## 项目结构 (Project Structure)

*   `app/` (Next.js App Router 核心目录)
    *   `page.tsx`: 客户端首页组件映射（获取初始化组织流）。
    *   `HomeClient.tsx`: 考前参数配置交互表单组件。
    *   `exam/`: 在线答题核心渲染引擎。
    *   `mistakes/`: 错题本页及列表组件。
    *   `admin/`: 包含组织、人员、题库大类的综合控制面板。
    *   `login/` & `register/`: 用户认证 (Server Component 结合 Server Actions)。
*   `components/`
    *   存放 `Navbar` 导航、`OrgConfigModal` 组织配属弹窗等复用组件。
*   `utils/`
    *   `supabase/`: 包含 `server.ts` 和 `client.ts`，用于提供跨端调用的 Supabase 实例。
*   `supabase/` (同原版)
    *   `schema.sql`: 数据库表结构与 RLS 本地定义备份。

## 快速开始 (Quick Start)

### 1. 基础配置
确保您已经安装了 [Node.js](https://nodejs.org/) (建议 18.x 以上版本)。

```bash
# 1. 切换到项目目录
cd c:\develop\mockExam_git\iexam

# 2. 安装依赖
npm install
```

### 2. 环境变量设置
在 `iexam/` 根目录下创建一个 `.env.local` 文件，并填入您的 Supabase 凭证：
```env
NEXT_PUBLIC_SUPABASE_URL=https://您的-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=您的-anon-key
```

### 3. 本地启动
```bash
npm run dev
```
打开浏览器访问 `http://localhost:3000` 即可预览项目。

## Vercel 一键部署 (Deployment)

由于本项目移除了客户端 APK 打包的需求特性而转向纯净的 PWA / Web 标准，部署尤为简单：

1. 将本仓储推送到您的 GitHub。
2. 在 **Vercel Dashboard** 中点击 `Import Project`，选择该 `mockExam_git` (选择 `iexam` 为 Root Directory)。
3. 在 **Environment Variables** 设置面板中，填入与本地一致的两个 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
4. 点击 **Deploy**。Vercel 会自动识别 Next.js 并执行构建，数分钟后即可上线全球 CDN 原生无服务器应用！

## Excel 题库导入说明

与原版本类似，管理后台处理 Excel 题库时需具有指定题头表头结构。首行需具有标识字眼（例如包含：`题型`、`题目`、`选项A`、`答案`、`解析` 等）程序将全自动解析装载至 Postgres。
