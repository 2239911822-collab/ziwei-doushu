import { NextRequest } from 'next/server';
import https from 'https';

export async function POST(request: NextRequest) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (!apiKey) return Response.json({ error: '未配置API Key' }, { status: 500 });

  try {
    const { chartA, chartB, question } = await request.json();
    const summaryA = brief(chartA, '甲方');
    const summaryB = brief(chartB, '乙方');
    const q = question || '请分析两人的缘分匹配度和相处建议';

    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是紫微斗数合盘分析专家。分析两人缘分匹配度、感情走向、相处建议。客观中肯。' },
        { role: 'user', content: `${summaryA}\n\n${summaryB}\n\n${q}` },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    });

    const stream = await new Promise<ReadableStream>((resolve, reject) => {
      const req = https.request({
        hostname: 'api.deepseek.com', port: 443, path: '/v1/chat/completions', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'Content-Length': Buffer.byteLength(body) },
        timeout: 60000,
      }, (res) => {
        if (res.statusCode !== 200) { let d=''; res.on('data',c=>d+=c); res.on('end',()=>reject(new Error(d))); return; }
        const encoder = new TextEncoder();
        resolve(new ReadableStream({
          start(controller) {
            let buf = '';
            res.on('data', (c: Buffer) => {
              buf += c.toString();
              const lines = buf.split('\n'); buf = lines.pop() || '';
              for (const l of lines) {
                const t = l.trim(); if (!t||!t.startsWith('data: ')) continue;
                const d = t.slice(6); if (d==='[DONE]') continue;
                try { const ct = JSON.parse(d).choices?.[0]?.delta?.content; if(ct) controller.enqueue(encoder.encode(`data: ${JSON.stringify({delta:{text:ct}})}\n\n`)); } catch {}
              }
            });
            res.on('end', () => { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); });
            res.on('error', e => controller.error(e));
          }
        }));
      });
      req.on('error', e => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body); req.end();
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function brief(chart: any, label: string): string {
  const b = chart?.birthInfo || {};
  const p = chart?.palaces || [];
  const m = p.find((x: any) => x.isMingGong);
  const f = p.find((x: any) => x.name === '夫妻');
  let s = `${label}：${b.year}年 ${b.gender==='male'?'男':'女'}`;
  if (m) s += ` 命宫主星：${(m.stars||[]).filter((x:any)=>x.type==='major').map((x:any)=>x.name).join('、')||'无'}`;
  if (f) s += ` 夫妻宫主星：${(f.stars||[]).filter((x:any)=>x.type==='major').map((x:any)=>x.name).join('、')||'无'}`;
  return s;
}