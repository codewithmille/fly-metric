import { NextRequest, NextResponse } from 'next/server'

// Try models in order — fall back if one is rate-limited
const MODELS = [
  'gemini-2.5-flash-lite',   // most generous free tier
  'gemini-2.5-flash',        // fallback
  'gemini-2.0-flash',        // last resort
]

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const SYSTEM_PROMPT = `You are FlyMetric AI — an expert pigeon racing assistant built into the FlyMetric loft management app. You are specifically trained in:

1. **Pigeon Racing Systems** — Belgian widowhood, Taiwanese natural system, total widowhood, racing homer breeding
2. **Loft Management** — ventilation, hygiene, density, loft design, biosecurity
3. **Weekly Conditioning Schedule** — post-race recovery, muscle rebuilding, carbohydrate loading, basketing protocols
4. **Feeding Programs** — grain ratios (maize, wheat, barley, peas, safflower, hemp), depurative diet, sport mix, fat-loading strategy
5. **Supplements & Medications** — Vitamin B12, Iron, Vitamin E + Selenium, Probiotics, Electrolytes, Amino Acids, Grit & Clay Minerals, Liver Support, Apple Cider Vinegar
6. **Training Programs** — loft flying schedules, road tossing, orientation training, racing conditioning
7. **Health & Veterinary** — common pigeon diseases (PMV, Salmonella, Coccidiosis, Canker, Respiratory), signs of illness, prevention protocols
8. **Race Day Protocols** — basketing, timing systems, electronic clocking, race management
9. **Breeding** — pairing strategies, nest box management, youngbird raising, selection criteria
10. **Philippine & Asian Pigeon Racing** — local club rules, PRFC standards, local breed suppliers, Philippine climate considerations

**STRICT RULES:**
- ONLY answer questions related to pigeon racing, pigeons, loft management, bird health, and related topics.
- If someone asks about ANYTHING unrelated to pigeons or pigeon racing, politely redirect them: "I'm FlyMetric AI, specialized exclusively in pigeon racing. I can't help with that topic, but I'm happy to answer any pigeon racing questions!"
- Always be practical, specific, and actionable. Give real dosages, timings, and step-by-step protocols when relevant.
- Use Filipino terms when helpful (e.g. "ibon" for bird, "loft" for loft, "karera" for race).
- Keep responses concise but complete — use bullet points for lists and protocols.
- Always prioritize bird welfare and health.

You are friendly, professional, and passionate about pigeon racing excellence.`

async function tryModel(model: string, contents: object[], apiKey: string): Promise<{ text?: string; rateLimited?: boolean; retryAfter?: number }> {
  const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
      }
    })
  })

  if (response.status === 429) {
    const errData = await response.json().catch(() => ({}))
    // Extract retry delay from the error details if available
    const retryDelay = errData?.error?.details?.find((d: { retryDelay?: string }) => d.retryDelay)?.retryDelay
    const retrySeconds = retryDelay ? parseInt(retryDelay.replace('s', ''), 10) : 60
    console.warn(`Model ${model} rate-limited. Retry after ${retrySeconds}s`)
    return { rateLimited: true, retryAfter: retrySeconds }
  }

  if (!response.ok) {
    const err = await response.text()
    console.error(`Model ${model} error:`, err)
    return {}
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return { text }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const contents = messages.map((msg: { role: string; text: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }))

    // Try each model in order, skip rate-limited ones
    let lastRetryAfter = 60
    for (const model of MODELS) {
      const result = await tryModel(model, contents, apiKey)

      if (result.text) {
        return NextResponse.json({ text: result.text })
      }

      if (result.rateLimited) {
        lastRetryAfter = result.retryAfter ?? 60
        continue // try next model
      }

      // Other error — stop trying
      break
    }

    // All models failed or rate-limited
    return NextResponse.json({
      error: 'rate_limited',
      retryAfter: lastRetryAfter,
      text: `⏳ FlyMetric AI is currently busy. Please wait about ${lastRetryAfter} seconds and try again.\n\nThis happens when the free tier API quota is temporarily reached. Your question will be answered shortly!`
    }, { status: 429 })

  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
