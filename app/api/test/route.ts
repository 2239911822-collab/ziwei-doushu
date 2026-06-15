import { NextRequest } from 'next/server';
import https from 'https';

export async function GET(request: NextRequest) {
  const result: any = {};
  
  // Check env
  result.apiKey = process.env.DEEPSEEK_API_KEY 
    ? process.env.DEEPSEEK_API_KEY.substring(0, 10) + '...' 
    : 'MISSING';
  result.baseUrl = process.env.DEEPSEEK_BASE_URL || 'default';

  // Test connection to DeepSeek
  const testResult: any = {};
  try {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 10,
    });

    const response = await new Promise<string>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.deepseek.com',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          timeout: 15000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(`status:${res.statusCode} body:${data.substring(0, 300)}`));
        }
      );
      req.on('error', (e) => reject(`connect_error:${e.message}`));
      req.on('timeout', () => { req.destroy(); reject('timeout'); });
      req.write(body);
      req.end();
    });
    testResult.response = response;
  } catch (e: any) {
    testResult.error = e.toString();
  }

  result.deepseekTest = testResult;

  return Response.json(result);
}