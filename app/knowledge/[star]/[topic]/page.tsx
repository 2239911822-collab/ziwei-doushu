/**
 * /knowledge/[star]/[topic] 锟?SEO 钀藉湴锟? *
 * 14 涓绘槦 脳 13 topic = 182 涓嫭锟?URL
 * 姣忛〉鍚畬鏁寸殑 STAR_DB 4 娈佃鏂紙涓€鍙ヨ瘽瀹氳皟/鏍稿績璁烘柇/鍛界洏渚濇嵁/缁忓吀鍑哄锟? *
 * SEO 瑕佺偣锟? *  - title 鍚富鍏抽敭璇嶏紙锟?绱井鍏ュ懡瀹峰€捣澶忎綋绯昏锟?锟? *  - description 锟?dingdiao锛堜竴鍙ヨ瘽瀹氳皟锟? *  - JSON-LD Article 缁撴瀯鍖栨暟锟? *  - 鍐呴摼锛氬悓涓绘槦鍏朵粬 12 锟?+ 鍚屽鍏朵粬 13 涓绘槦
 *  - generateStaticParams 闈欐€佺敓鎴愶紝闆惰繍琛屾椂寮€閿€
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { TopicKey } from '@/lib/ziwei/db-analysis';
import {
  ALL_STARS,
  ALL_TOPICS,
  getKnowledge,
  getAllKnowledgeRoutes,
  STAR_BRIEF_SEO,
  STAR_TO_SLUG,
  SLUG_TO_STAR,
} from '@/lib/seo/knowledge';

// 鍏佽鍔ㄦ€佸弬鏁帮細濡傛灉鏌愪釜 star/topic 缁勫悎涓嶅湪 generateStaticParams 鍒楄〃锟?// 涔熷厑璁歌繍琛屾椂鎸夐渶娓叉煋锛岄伩鍏嶄腑锟?URL 缂栫爜闂瀵艰嚧 404

export async function generateStaticParams() {
  const routes = getAllKnowledgeRoutes();
  // URL 鐢ㄦ嫾锟?slug 鏇夸唬涓枃锛岄伩寮€ Vercel/CDN 涓枃璺敱杈圭晫闂
  return routes.map(r => ({ star: r.slug, topic: r.topic }));
}

export async function generateMetadata({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = SLUG_TO_STAR[slug];
  if (!star) return {};
  const data = getKnowledge(star, topic as TopicKey);
  if (!data.exists) return {};

  const title = `${star}锟?{data.palaceName}锟?路 ${data.topicLabel} 路 鍊捣澶忎綋绯昏瑙;
  const description = data.parsed.dingdiao
    || `${star}锟?{data.palaceName}瀹殑绱井鏂楁暟瑙ｈ 锟?鍩轰簬鍊捣澶忋€婂ぉ绾€嬩綋绯讳笌鍙ょ睄銆婄传寰枟鏁板叏闆嗐€嬨€婇楂撹祴銆嬨€俙;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://xiaoyuanzhanbu.top/knowledge/${slug}/${topic}`,
    },
    alternates: {
      canonical: `https://xiaoyuanzhanbu.top/knowledge/${slug}/${topic}`,
    },
    keywords: [
      '绱井鏂楁暟', '鍊捣锟?, star, data.palaceName, data.topicLabel,
      `${star}${data.palaceName}`, `${star}锟?{data.palaceName}`,
      `绱井鏂楁暟 ${star}`, '鍊捣鍘︾传寰枟锟?, '绱井鏂楁暟鍏ㄩ泦',
    ],
  };
}

export default async function KnowledgePage({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = SLUG_TO_STAR[slug];
  if (!star) notFound();
  const data = getKnowledge(star, topic as TopicKey);
  if (!data.exists) notFound();

  // 鍚屼富鏄熷叾锟?topic
  const otherTopicsForStar = ALL_TOPICS.filter(t => t !== topic && getKnowledge(star, t).exists);
  // 锟?topic 鍏朵粬涓绘槦
  const otherStarsForTopic = ALL_STARS.filter(s => s !== star && getKnowledge(s, topic as TopicKey).exists);

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${star}锟?{data.palaceName}锟?路 ${data.topicLabel}`,
    description: data.parsed.dingdiao,
    author: { '@type': 'Organization', name: '绱井鐮旂┒ 路 鍊捣澶忔锟? },
    publisher: {
      '@type': 'Organization',
      name: '绱井鐮旂┒',
      url: 'https://xiaoyuanzhanbu.top',
    },
    datePublished: '2026-04-28',
    dateModified: '2026-04-28',
    mainEntityOfPage: `https://xiaoyuanzhanbu.top/knowledge/${slug}/${topic}`,
    articleSection: '绱井鏂楁暟 路 鍊捣澶忎綋锟?,
    keywords: [`绱井鏂楁暟`, star, data.palaceName, data.topicLabel].join(', '),
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 椤舵爮 */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(184,146,42,0.15)', background: 'var(--bg-page)' }}>
        <Link href="/" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.3em', textDecoration: 'none' }}>
          锟?棣栭〉
        </Link>
        <div style={{ fontSize: '12px', color: 'var(--tx-3)', letterSpacing: '0.2em' }}>
          鍊笀鏂规硶锟?路 鐭ヨ瘑锟?        </div>
        <Link href="/chart" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em', textDecoration: 'none' }}>
          璧风洏 锟?        </Link>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* 闈㈠寘锟?*/}
        <nav style={{ fontSize: '11px', color: 'var(--tx-3)', letterSpacing: '0.1em', marginBottom: '16px' }}>
          <Link href="/" style={{ color: 'var(--tx-3)', textDecoration: 'none' }}>棣栭〉</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link href="/knowledge" style={{ color: 'var(--tx-3)', textDecoration: 'none' }}>鐭ヨ瘑锟?/Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>{star}</span>
          <span style={{ margin: '0 8px' }}>路</span>
          <span style={{ color: 'var(--ac)' }}>{data.palaceName}锟?/span>
        </nav>

        {/* 鏍囬锟?*/}
        <header style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', color: 'var(--tx-3)', letterSpacing: '0.25em', marginBottom: '8px' }}>
            {data.topicLabel} 路 鍊捣澶忎綋绯昏锟?          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: 'var(--tx-0)', letterSpacing: '0.1em', lineHeight: 1.2 }}>
            {star}鍏data.palaceName}锟?          </h1>
          {STAR_BRIEF_SEO[star] && (
            <p style={{ fontSize: '13px', color: 'var(--tx-2)', marginTop: '14px', lineHeight: 1.8 }}>
              {STAR_BRIEF_SEO[star]}
            </p>
          )}
        </header>

        {/* 鍐呭 4 锟?*/}
        {data.parsed.dingdiao && (
          <Section title="涓€鍙ヨ瘽瀹氳皟" gradient>
            <p style={{ fontSize: '17px', color: 'var(--tx-0)', lineHeight: 1.9, fontWeight: 500, letterSpacing: '0.04em' }}>
              {data.parsed.dingdiao}
            </p>
          </Section>
        )}

        {data.parsed.lundian && (
          <Section title="鏍稿績璁烘柇">
            <div style={{ fontSize: '15px', color: 'var(--tx-0)', lineHeight: 2, letterSpacing: '0.02em', whiteSpace: 'pre-wrap' }}>
              {data.parsed.lundian}
            </div>
          </Section>
        )}

        {data.parsed.yiju && (
          <Section title="鍛界洏渚濇嵁">
            <div style={{ fontSize: '14px', color: 'var(--tx-0)', lineHeight: 2, letterSpacing: '0.02em', whiteSpace: 'pre-wrap' }}>
              {data.parsed.yiju}
            </div>
          </Section>
        )}

        {data.parsed.chuchu && (
          <Section title="缁忓吀鍑哄" minimal>
            <div style={{ fontSize: '13px', color: 'var(--tx-2)', lineHeight: 2, letterSpacing: '0.02em', whiteSpace: 'pre-wrap' }}>
              {data.parsed.chuchu}
            </div>
          </Section>
        )}

        {/* CTA */}
        <div style={{
          margin: '40px 0 30px',
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(212,169,72,0.15) 0%, rgba(184,146,42,0.06) 100%)',
          borderRadius: '14px',
          border: '1px solid rgba(184,146,42,0.3)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '14px', color: 'var(--tx-0)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '6px' }}>
            鎯崇湅浣犺嚜宸卞懡鐩樼殑{data.topicLabel}锟?          </div>
          <div style={{ fontSize: '12px', color: 'var(--tx-2)', marginBottom: '16px' }}>
            杈撳叆鐢熻景璧风洏 路 鍊笀姝ｅ畻瑙ｈ 路 AI 绛旂枒浼村
          </div>
          <Link href="/chart" style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #d4a948 0%, #b8922a 100%)',
            color: 'white',
            borderRadius: '999px',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(184,146,42,0.3)',
          }}>
            绔嬪嵆璧风洏 锟?          </Link>
        </div>

        {/* 鍐呴摼锛氬悓涓绘槦鍏朵粬 topic */}
        <Section title={`${star}鏄熺殑鍏朵粬瀹綅瑙ｈ`} minimal>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {otherTopicsForStar.map(t => {
              const d = getKnowledge(star, t);
              return (
                <Link
                  key={t}
                  href={`/knowledge/${slug}/${t}`}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(184,146,42,0.25)',
                    borderRadius: '999px',
                    color: 'var(--tx-2)',
                    textDecoration: 'none',
                  }}
                >
                  {star}鍏d.palaceName}
                </Link>
              );
            })}
          </div>
        </Section>

        {/* 鍐呴摼锛氬悓 topic 鍏朵粬涓绘槦 */}
        <Section title={`鍏朵粬涓绘槦锟?{data.palaceName}瀹殑瑙ｈ`} minimal>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {otherStarsForTopic.slice(0, 13).map(s => (
              <Link
                key={s}
                href={`/knowledge/${STAR_TO_SLUG[s]}/${topic}`}
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(184,146,42,0.25)',
                  borderRadius: '999px',
                  color: 'var(--tx-2)',
                  textDecoration: 'none',
                }}
              >
                {s}鍏data.palaceName}
              </Link>
            ))}
          </div>
        </Section>

        {/* 鍙ょ睄搴撻摼锟?*/}
        <div style={{
          marginTop: '40px',
          padding: '16px 20px',
          background: 'rgba(184,146,42,0.04)',
          border: '1px dashed rgba(184,146,42,0.25)',
          borderRadius: '10px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--ac-dim)', letterSpacing: '0.15em', marginBottom: '6px' }}>
            鎯宠鍘熷吀锟?          </div>
          <Link href="/library" style={{ fontSize: '13px', color: 'var(--ac)', fontWeight: 500, letterSpacing: '0.1em', textDecoration: 'none' }}>
            馃摐 鏌ラ槄鍙ょ睄鍘熷吀锟?锟?绱井鏂楁暟鍏ㄩ泦 / 鍏ㄤ功 / 楠ㄩ珦锟?锟?          </Link>
        </div>
      </article>

      {/* 椤佃剼 */}
      <footer style={{ borderTop: '1px solid rgba(184,146,42,0.15)', padding: '20px 24px', textAlign: 'center', fontSize: '11px', color: 'var(--tx-3)', letterSpacing: '0.1em' }}>
        <div style={{ marginBottom: '6px' }}>绱井鐮旂┒ 路 鍩轰簬鍊捣澶忔瀹椾綋锟?路 浠呬緵瀛︿範鍙傦拷?/div>
        <div style={{ opacity: 0.85 }}>鏈钩鍙颁笉鏋勬垚浠讳綍鍖荤枟銆佹姇璧勩€佹硶寰嬫垨閲嶅ぇ鍐崇瓥寤鸿</div>
      </footer>
    </div>
  );
}

function Section({ title, children, gradient, minimal }: { title: string; children: React.ReactNode; gradient?: boolean; minimal?: boolean }) {
  return (
    <section style={{ marginBottom: minimal ? '24px' : '32px' }}>
      <h2 style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: 'var(--ac)',
        fontWeight: 600,
        letterSpacing: '0.2em',
        marginBottom: '12px',
      }}>
        <span style={{ width: '4px', height: '14px', background: 'var(--ac)', borderRadius: '2px' }} />
        {title}
      </h2>
      <div style={{
        background: gradient
          ? 'linear-gradient(135deg, rgba(212,169,72,0.12) 0%, rgba(184,146,42,0.04) 100%)'
          : 'white',
        border: '1px solid rgba(184,146,42,0.15)',
        borderRadius: '10px',
        padding: minimal ? '14px 18px' : '20px 22px',
      }}>
        {children}
      </div>
    </section>
  );
}
