import { NextRequest } from 'next/server';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

export async function POST(request: NextRequest) {
  try {
    const { chart, messages } = await request.json();

    if (!chart) {
      return new Response(JSON.stringify({ error: '缺少命盘数据' }), { status: 400 });
    }

    if (!DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({ error: '未配置 AI API Key' }), { status: 500 });
    }

    const chartSummary = buildChartSummary(chart);

    const systemPrompt = `你是紫微斗数命理分析专家。
请根据命盘数据，用通俗易懂的中文进行解读。
分析风格：客观中肯，既指出优势也点明需要注意的地方。
不要编造不存在的星曜和宫位，严格基于给出的命盘数据进行解读。`;

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `以下是命盘数据，请记住这些信息，后续根据用户的提问进行解读：\n\n${chartSummary}` },
      ...(messages || []).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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
      const err = await response.text();
      return new Response(JSON.stringify({ error: `AI 服务异常` }), { status: 502 });
    }

    // Stream the response back to the client in SSE format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

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
                  const sseData = JSON.stringify({ delta: { text: content } });
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }
              } catch {
                // skip unparseable chunks
              }
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

function buildChartSummary(chart: any): string {
  const birth = chart.birthInfo || {};
  const palaces = chart.palaces || [];

  let summary = `## 命主信息\n`;
  summary += `- 出生：${birth.year}年${birth.month}月${birth.day}日 ${birth.hour}时\n`;
  summary += `- 性别：${birth.gender === 'male' ? '男' : '女'}\n\n`;
  summary += `## 十二宫详情\n`;

  for (const p of palaces) {
    const stars = (p.stars || [])
      .filter((s: any) => s.type === 'major')
      .map((s: any) => s.name)
      .join('、');
    const minorStars = (p.stars || [])
      .filter((s: any) => s.type !== 'major')
      .map((s: any) => s.name)
      .join('、');
    const sihua = (p.selfSihua || []).map((s: any) => `${s.starName}自化${s.siHua}`).join('、');

    let line = `【${p.name}】${p.isEmpty ? '(空宫)' : ''}`;
    if (p.isMingGong) line += ' ⭐命宫';
    line += ` 主星: ${stars || '无'}`;
    if (minorStars) line += ` | 辅星: ${minorStars}`;
    if (sihua) line += ` | 自化: ${sihua}`;
    summary += line + '\n';
  }

  return summary;
}