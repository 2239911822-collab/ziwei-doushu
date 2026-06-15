import { NextRequest } from 'next/server';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

export async function POST(request: NextRequest) {
  try {
    const { chartA, chartB, question } = await request.json();

    if (!chartA || !chartB) {
      return new Response(JSON.stringify({ error: '需要双方命盘数据' }), { status: 400 });
    }

    if (!DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({ error: '未配置 AI API Key' }), { status: 500 });
    }

    const summaryA = buildBriefSummary(chartA, '甲方');
    const summaryB = buildBriefSummary(chartB, '乙方');

    const systemPrompt = `你是紫微斗数合盘分析专家。
请基于双方命盘数据分析两人的缘分匹配度、感情走向和相处建议。
分析框架：
1. 双方命宫主星匹配度
2. 夫妻宫互动关系
3. 性格互补与冲突点
4. 相处建议
请客观中肯，坦诚分析。`;

    const userQuestion = question || '请分析两人的缘分匹配度和相处建议';

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `${summaryA}\n\n${summaryB}\n\n${userQuestion}` },
    ];

    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'AI 服务异常' }), { status: 502 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { text: content } })}\n\n`));
                }
              } catch { /* skip */ }
            }
          }
        } catch (e) {
          console.error('Stream error:', e);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '服务器错误' }), { status: 500 });
  }
}

function buildBriefSummary(chart: any, label: string): string {
  const birth = chart.birthInfo || {};
  const palaces = chart.palaces || [];

  const mingGong = palaces.find((p: any) => p.isMingGong);
  const fuQi = palaces.find((p: any) => p.name === '夫妻');

  let summary = `## ${label}\n`;
  summary += `- 出生年份：${birth.year}年\n`;
  summary += `- 性别：${birth.gender === 'male' ? '男' : '女'}\n`;

  if (mingGong) {
    const stars = (mingGong.stars || [])
      .filter((s: any) => s.type === 'major')
      .map((s: any) => s.name).join('、');
    summary += `- 命宫主星：${stars || '无'}\n`;
  }

  if (fuQi) {
    const stars = (fuQi.stars || [])
      .filter((s: any) => s.type === 'major')
      .map((s: any) => s.name).join('、');
    summary += `- 夫妻宫主星：${stars || '无'}\n`;
  }

  return summary;
}