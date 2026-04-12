import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// 强制 Next.js 不缓冲此路由的响应，以支持流式输出
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { questionId, title, options, type, stream = true } = await req.json();

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

        // 检查题干是否包含图片元素（Markdown 或 HTML）
        const hasImages = /!\[.*?\]\(.*?\)/.test(title || '') || /<img[^>]*>/.test(title || '');
        if (hasImages) {
            return NextResponse.json({ error: '暂不支持图片解析。' }, { status: 400 });
        }

        // Remove markdown images like ![...](...) and html images <img ...>
        const cleanTitle = (title || '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '').trim();

        let prompt = '';
        const commonInstructions = `
### 任务要求：
1. **【最高优先级】篇幅控制**：解析和知识扩展**必须**控制在适中篇幅，极力避免长篇大论和机械枯燥的解释，**总字数绝对不要超过1000字**。
2. **解析内容**：请针对题目提供专业、准确的解析，逻辑清晰，语言精练。
3. **知识扩展**：这部分必须作为**完全独立的板块**，进行相关知识点的纵向深挖或横向关联（如核心原理、底层逻辑、易错陷阱等）。**绝对严禁在此部分再次提及、暗示或显示本题的答案**。需纯粹地讲透知识本身，可出同类型的题目说明。
4. **格式规范**（极为重要，必须严格遵守）：
    - **数学表达式**：**所有**数学符号、变量名（即使是单个字母如 $i$、$n$、$x$）、公式、等式（如 $i=1$、$i-1$、$2i+1$）都**必须**使用 $（行内）或 $$（块级）定界符包裹。绝不能让任何数学变量以纯文本形式出现在中文句子中。
    - **禁用样式**：**绝对严禁使用 \\boxed{} 或 $\\boxed{B}$ 等带框格式来突出显示答案。**
    - **LaTeX指令**：**严禁直接输出 Unicode 数学字符**，必须使用对应的 LaTeX 指令：
        - ❌ 禁止：⌈x⌉、⌊x⌋、≠、≤、≥ 等 Unicode 符号
        - ✅ 正确：$\\lceil x \\rceil$、$\\lfloor x \\rfloor$、$\\neq$、$\\leq$、$\\geq$
    - **范围表示**：使用"-"或"至"，**严禁使用波浪线"~"**。
    - **根号表示**：必须使用 $\\sqrt{x}$，**严禁使用 Unicode 符号 "√"**。
    - **示例对照**：
        - ❌ 错误：结点i、i为偶数、其兄弟为i+1、⌈x⌉、√N、1~10
        - ✅ 正确：结点 $i$、$i$ 为偶数、其兄弟为 $i+1$、$\\lceil x \\rceil$、$\\sqrt{N}$、1-10
    - **代码片段**：所有编程代码（C++、Python、Java 等）**必须**使用 Markdown 代码围栏格式，即用三个反引号包裹，并标注语言名称。例如：

\`\`\`cpp
std::unique_ptr<int> ptr(new int(10));
\`\`\`

        - ❌ 严禁使用 \\text{代码} 或 \\texttt{代码} 来展示代码，这会导致渲染失败。
        - ❌ 严禁将代码放在 $ 数学公式定界符内。

`;

        if (type === 'judge') {
            prompt = `你是一个专业的考试辅导专家。请为以下判断题生成解析，并进行一定的知识扩展。${commonInstructions}\n\n题目：${cleanTitle}`;
        } else {
            let formattedOptions = '';
            if (Array.isArray(options)) {
                formattedOptions = options
                    .map((opt: any) => {
                        // 兼容字段名：优先使用 value（前端渲染字段），其次使用 content
                        const rawContent = opt.value || opt.content || '';
                        const content = rawContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '').trim();
                        return `${opt.label || ''}. ${content}`;
                    })
                    .join('\n');
            }
            prompt = `你是一个专业的考试辅导专家。请为选择题生成解析，分析正确项并提供扩展。${commonInstructions}\n\n题目：${cleanTitle}\n选项：\n${formattedOptions}`;
        }

        const apiKey = process.env.JIUTIAN_APK_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: '系统缺少 JIUTIAN_APK_KEY 配置' }, { status: 500 });
        }

        const payload = {
            "model": "deepseek-v3",
            "messages": [{ "role": "user", "content": prompt }],
            "stream": stream
        };

        const response = await fetch('https://jiutian.10086.cn/largemodel/moma/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('AI API Error:', response.status, errBody);
            return NextResponse.json({ error: `AI 服务返回错误: ${response.status}` }, { status: response.status });
        }

        if (stream) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let fullContent = '';
            // 用于跨 chunk 拼接不完整 SSE 行的行缓冲区
            let lineBuffer = '';

            const readableStream = new ReadableStream({
                async start(controller) {
                    const reader = response.body?.getReader();
                    if (!reader) {
                        controller.close();
                        return;
                    }

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            // 将新的 chunk 追加到行缓冲区
                            lineBuffer += decoder.decode(value, { stream: true });

                            // 按换行符切割，最后一个元素可能是不完整行，保留在缓冲区
                            const lines = lineBuffer.split('\n');
                            lineBuffer = lines.pop() ?? '';

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed.startsWith('data:')) continue;

                                const dataStr = trimmed.slice(5).trim();
                                if (dataStr === '[DONE]') continue;
                                if (!dataStr) continue;

                                try {
                                    const parsed = JSON.parse(dataStr);
                                    const content = parsed.choices?.[0]?.delta?.content ?? '';
                                    if (content) {
                                        fullContent += content;
                                        controller.enqueue(encoder.encode(content));
                                    }
                                } catch (e) {
                                    // 忽略不完整 JSON（极少情况，由行缓冲区保障）
                                    console.warn('[SSE parse warn]', dataStr.slice(0, 80));
                                }
                            }
                        }

                        // 流结束后处理缓冲区中最后可能残留的行
                        if (lineBuffer.trim().startsWith('data:')) {
                            const dataStr = lineBuffer.trim().slice(5).trim();
                            if (dataStr && dataStr !== '[DONE]') {
                                try {
                                    const parsed = JSON.parse(dataStr);
                                    const content = parsed.choices?.[0]?.delta?.content ?? '';
                                    if (content) {
                                        fullContent += content;
                                        controller.enqueue(encoder.encode(content));
                                    }
                                } catch (_) { /* ignore */ }
                            }
                        }
                    } catch (error) {
                        console.error('Stream reading error:', error);
                        controller.error(error);
                    } finally {
                        if (fullContent && questionId) {
                            // 后处理：
                            // 1. 将 AI 误用的 \text{...} 或 \texttt{...} 转换为 markdown 行内代码
                            // 2. 将 可能存在的 Unicode 根号 √ 转换为 \sqrt{}
                            const processedContent = fullContent
                                .replace(/\\texttt?\{([^}]*)\}/g, '`$1`')
                                .replace(/√\s*([0-9a-zA-Z]+)/g, '$\\sqrt{$1}$')
                                .replace(/√(?![0-9a-zA-Z])/g, '\\sqrt')
                                .replace(/(?<!\$)\\boxed\{([A-Z0-9]+)\}(?!\$)/g, '$\\boxed{$1}$')
                                .replace(/(?<!\$)\\boxed\{(正确|错误)\}(?!\$)/g, '$\\boxed{$1}$')
                                .replace(/(?<!\$)\\boxed\{\\text\{(正确|错误)\}\}(?!\$)/g, '$\\boxed{\\text{$1}}$');

                            await supabase
                                .from('questions')
                                .update({ parse: processedContent })
                                .eq('id', questionId);
                        }
                        controller.close();
                    }
                }
            });

            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'X-Accel-Buffering': 'no',
                },
            });
        } else {
            // 非流式模式
            const data = await response.json();

            if (data && data.choices && data.choices.length > 0) {
                let aiResponse = data.choices[0].message?.content || '';

                // 后处理
                aiResponse = aiResponse
                    .replace(/\\texttt?\{([^}]*)\}/g, '`$1`')
                    .replace(/√\s*([0-9a-zA-Z]+)/g, '$\\sqrt{$1}$')
                    .replace(/√(?![0-9a-zA-Z])/g, '\\sqrt')
                    .replace(/(?<!\$)\\boxed\{([A-Z0-9]+)\}(?!\$)/g, '$\\boxed{$1}$')
                    .replace(/(?<!\$)\\boxed\{(正确|错误)\}(?!\$)/g, '$\\boxed{$1}$')
                    .replace(/(?<!\$)\\boxed\{\\text\{(正确|错误)\}\}(?!\$)/g, '$\\boxed{\\text{$1}}$');

                if (aiResponse && questionId) {
                    await supabase
                        .from('questions')
                        .update({ parse: aiResponse })
                        .eq('id', questionId);
                }

                return NextResponse.json({ result: aiResponse });
            } else {
                console.error('JIUTIAN API Return Error:', data);
                return NextResponse.json({ error: 'AI 服务未返回有效响应', details: data }, { status: 500 });
            }
        }
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
