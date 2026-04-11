import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { title, options, type } = await req.json();
        
        // Remove markdown images like ![...](...) and html images <img ...>
        const cleanTitle = (title || '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '').trim();
        
        let prompt = '';
        if (type === 'judge') {
            prompt = `你是一个专业的考试辅导专家。请为以下判断题生成解析，并进行一定的知识扩展。要求：直接给出解析和知识点，不需要重复回答正确与否，因为用户已经知道。\n\n题目：${cleanTitle}`;
        } else {
            // single or multiple choice
            const cleanOptions = options ? JSON.stringify(options).replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '') : '';
            prompt = `你是一个专业的考试辅导专家。请为以下选择题生成解析，分析正确选项并进行一定的知识扩展。要求：直接给出解析和知识点。\n\n题目：${cleanTitle}\n选项：${cleanOptions}`;
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
            const aiResponse = data.choices[0].message?.content || '';
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
