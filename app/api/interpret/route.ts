import { NextRequest } from 'next/server';
import https from 'https';

export async function POST(request: NextRequest) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();

  if (!apiKey) {
    return Response.json({ error: '未配置API Key' }, { status: 500 });
  }

  try {
    const { chart, messages } = await request.json();

    const systemPrompt = '你是紫微斗数命理分析专家，基于正统紫微斗数体系进行命盘解读。请用通俗易懂的中文，结合命盘实际数据进行分析，客观中肯。';

    const chartSummary = chart
      ? formatChartSummary(chart)
      : '';

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(chartSummary ? [{ role: 'user', content: `以下是命盘数据：\n\n${chartSummary}\n\n请记住这些信息，后续根据用户提问进行解读。` }] : []),
      ...(messages || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    });

    const deepseekStream = await new Promise<ReadableStream>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.deepseek.com',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 60000,
        },
        (res) => {
          if (res.statusCode !== 200) {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => reject(new Error(`DeepSeek ${res.statusCode}: ${d.substring(0, 200)}`)));
            return;
          }

          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              let buffer = '';
              res.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
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
              });

              res.on('end', () => {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              });

              res.on('error', (e) => controller.error(e));
            },
          });
          resolve(stream);
        }
      );

      req.on('error', (e) => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });

    return new Response(deepseekStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e: any) {
    console.error('API error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function formatChartSummary(chart: any): string {
  const birth = chart.birthInfo || {};
  const palaces = chart.palaces || [];

  let s = `出生：${birth.year}年${birth.month}月${birth.day}日 ${birth.hour}时 性别：${birth.gender === 'male' ? '男' : '女'}\n\n`;

  for (const p of palaces) {
    const majorStars = (p.stars || []).filter((s: any) => s.type === 'major').map((s: any) => s.name).join('、');
    const minorStars = (p.stars || []).filter((s: any) => s.type !== 'major').map((s: any) => s.name).join('、');
    const sihua = (p.selfSihua || []).map((sh: any) => `${sh.starName}自化${sh.siHua}`).join('、');

    s += `【${p.name}】${p.isMingGong ? '⭐命宫 ' : ''}${p.isEmpty ? '(空宫) ' : ''}主星: ${majorStars || '无'}`;
    if (minorStars) s += ` | 辅: ${minorStars}`;
    if (sihua) s += ` | 自化: ${sihua}`;
    s += '\n';
  }

  return s;
}