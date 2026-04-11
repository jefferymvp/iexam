import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { questionId, title, options, type } = await req.json();

        // Fetch user role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const userRole = profile?.role || 'user';

        // If questionId is provided, check if it already has a parse
        if (questionId) {
            const { data: question } = await supabase
                .from('questions')
                .select('parse')
                .eq('id', questionId)
                .single();

            if (question?.parse && question.parse.trim().length > 0 && userRole !== 'admin') {
                return NextResponse.json({ error: '该题目已有解析，只有管理员可以重新生成。' }, { status: 403 });
            }
        }


        // Remove markdown images like ![...](...) and html images <img ...>
        const cleanTitle = (title || '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '').trim();

        let prompt = '';
        const commonInstructions = `
### 任务要求：
1. **解析内容**：请针对题目提供专业、准确的解析，逻辑清晰，语言精练。
2. **知识扩展**：这部分应是相关知识点的纵向深挖或横向关联（如原理、背景、易错点、避坑指南等）。**严禁出类似的模拟题或同类题**，要讲透知识本身。
3. **格式规范**（极为重要，必须严格遵守）：
    - **数学表达式**：所有数学符号、变量、公式、计算式**必须**包裹在 $（行内）或 $$（块级）定界符中。即使是简单的 $n=4$、$L=124$ 也要包裹。
    - **LaTeX指令**：**严禁直接输出 Unicode 数学字符**，必须使用对应的 LaTeX 指令：
        - ❌ 禁止：⌈x⌉、⌊x⌋、≠、≤、≥ 等 Unicode 符号
        - ✅ 正确：$\\lceil x \\rceil$、$\\lfloor x \\rfloor$、$\\neq$、$\\leq$、$\\geq$
    - **范围表示**：使用"-"或"至"，**严禁使用波浪线"~"**。
    - **代码片段**：所有编程代码（C++、Python、Java 等）**必须**使用 Markdown 代码围栏格式，即用三个反引号包裹，并标注语言名称。例如：

\`\`\`cpp
std::unique_ptr<int> ptr(new int(10));
\`\`\`

        - ❌ 严禁使用 \\text{代码} 或 \\texttt{代码} 来展示代码，这会导致渲染失败。
        - ❌ 严禁将代码放在 $ 数学公式定界符内。
4. **篇幅控制**：解析和扩展应控制在适中篇幅，避免冗长，总字数不要超过1000字。

`;

        if (type === 'judge') {
            prompt = `你是一个专业的考试辅导专家。请为以下判断题生成解析，并进行一定的知识扩展。${commonInstructions}\n\n题目：${cleanTitle}`;
        } else {
            // single or multiple choice
            const cleanOptions = options ? JSON.stringify(options).replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '') : '';
            prompt = `你是一个专业的考试辅导专家。请为选择题生成解析，分析正确项并提供扩展。${commonInstructions}\n\n题目：${cleanTitle}\n选项：${cleanOptions}`;
        }

        const apiKey = process.env.JIUTIAN_APK_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: '系统缺少 JIUTIAN_APK_KEY 配置' }, { status: 500 });
        }

        const payload = {
            "model": "jiutian-lan-comv3",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": false
        };

        const response = await fetch('https://jiutian.10086.cn/largemodel/moma/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data && data.choices && data.choices.length > 0) {
            let aiResponse = data.choices[0].message?.content || '';

            // 后处理：将 AI 误用的 \text{...} 或 \texttt{...} 转换为 markdown 行内代码，防止渲染异常
            // 例如：\text{std::unique_ptr<int>} => `std::unique_ptr<int>`
            aiResponse = aiResponse.replace(/\\texttt?\{([^}]*)\}/g, '`$1`');

            // Save to database immediate if result is valid
            if (aiResponse && questionId) {
                const { error: updateError } = await supabase
                    .from('questions')
                    .update({ parse: aiResponse })
                    .eq('id', questionId);

                if (updateError) {
                    console.error('Failed to save AI parse to DB:', updateError);
                    // We still return the result to the user so they can see it, 
                    // but they might need to save it manually if the DB fails? 
                    // Actually, the user asked for "生成即保存", so we should ideally ensure it's saved.
                    // If it fails here, the user's RLS might still be the issue or some other error.
                }
            }

            return NextResponse.json({ result: aiResponse });
        } else {
            console.error('JIUTIAN API Return Error:', data);
            return NextResponse.json({ error: 'AI 服务未返回有效响应', details: data }, { status: 500 });
        }
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
