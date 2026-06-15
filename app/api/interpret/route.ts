import { NextRequest } from 'next/server';
import https from 'https';

function deepseekRequest(body: any, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 25000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
          return;
        }
        try {
          const json = JSON.parse(body);
          resolve(json.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(new Error('JSON parse error'));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`连接失败: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(data);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();

  console.log('=== Key exists:', !!apiKey && apiKey.length > 20);

  if (!apiKey || apiKey === 'your-deepseek-api-key') {
    return Response.json({ error: '未配置API Key' }, { status: 500 });
  }

  try {
    const { chart, messages } = await request.json();

    const systemPrompt = '你是紫微斗数专家。';
    const userContent = chart
      ? `分析命盘。出生：${chart.birthInfo?.year}年，性别：${chart.birthInfo?.gender}。`
      : '解读命盘。';

    const result = await deepseekRequest(
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages || []).filter((m: any) => m.role !== 'system'),
          { role: 'user', content: userContent },
        ],
        max_tokens: 2048,
      },
      apiKey
    );

    return Response.json({ interpretation: result });

  } catch (e: any) {
    console.error('=== Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}