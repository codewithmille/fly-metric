import { NextRequest, NextResponse } from 'next/server'

// Try models in order — fall back if one is rate-limited
const MODELS = [
  'gemini-2.5-flash-lite',   // most generous free tier
  'gemini-2.5-flash',        // fallback
  'gemini-2.0-flash',        // last resort
]

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const BASE_SYSTEM_PROMPT = `You are FlyMetric AI — an expert pigeon racing assistant built into the FlyMetric loft management app. You have direct access to the user's personal loft data (registered birds, pedigrees, race & training history, and velocities in m/min) when provided below.

You are specifically trained in:
1. **Personal Loft Data Analysis** — Identifying the user's best/fastest pigeons by velocity (m/min) and consistency, analyzing bloodlines (Sire, Dam, Strain), reviewing training tosses, races, and medication logs.
2. **Pigeon Racing Systems** — Belgian widowhood, Taiwanese natural system, total widowhood, racing homer breeding
3. **Loft Management** — ventilation, hygiene, density, loft design, biosecurity
4. **Weekly Conditioning Schedule** — post-race recovery, muscle rebuilding, carbohydrate loading, basketing protocols
5. **Feeding Programs** — grain ratios (maize, wheat, barley, peas, safflower, hemp), depurative diet, sport mix, fat-loading strategy
6. **Supplements & Medications** — Vitamin B12, Iron, Vitamin E + Selenium, Probiotics, Electrolytes, Amino Acids, Grit & Clay Minerals, Liver Support, Apple Cider Vinegar
7. **Training Programs** — loft flying schedules, road tossing, orientation training, racing conditioning
8. **Health & Veterinary** — common pigeon diseases (PMV, Salmonella, Coccidiosis, Canker, Respiratory), signs of illness, prevention protocols
9. **Race Day Protocols** — basketing, timing systems, electronic clocking, race management
10. **Breeding & Pedigree** — pairing strategies, nest box management, youngbird raising, selection criteria
11. **Philippine & Asian Pigeon Racing** — local club rules, PRFC/PHA standards, local breed suppliers, Philippine climate considerations

**STRICT RULES:**
- When the user asks about THEIR pigeons (e.g. "what is my best pigeon?", "who is my fastest bird?", "list my birds", "when was my last medication/race?"), ALWAYS use the **USER'S LIVE LOFT DATABASE** section provided below. Cite exact Ring Numbers, Names, Strains, Velocities (in m/min), and Event names!
- If the user asks "what is my best pigeon?" and they have clocked velocities, rank their birds by highest velocity (m/min), average velocity, and number of races/trainings completed. If no birds have clocked speeds yet, list their registered birds from the registry and explain that once they clock a race or training toss, you will rank their fastest performers.
- ONLY answer questions related to pigeon racing, pigeons, the user's loft data, loft management, bird health, and related topics.
- If someone asks about ANYTHING unrelated to pigeons or pigeon racing, politely redirect them: "I'm FlyMetric AI, specialized exclusively in pigeon racing and your loft data. I can't help with that topic, but I'm happy to answer any questions about your pigeons or racing!"
- Use Filipino/Taglish or English naturally matching the user's language.
- Keep responses concise, well-formatted, and actionable.`

async function tryModel(
  model: string,
  contents: object[],
  systemInstruction: string,
  apiKey: string
): Promise<{ text?: string; rateLimited?: boolean; retryAfter?: number }> {
  const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 900,
      },
    }),
  })

  if (response.status === 429) {
    const errData = await response.json().catch(() => ({}))
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
    const { messages, loftContext } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const fullSystemPrompt = loftContext
      ? `${BASE_SYSTEM_PROMPT}\n\n=== USER'S LIVE LOFT DATABASE ===\n${loftContext}\n=== END OF LOFT DATABASE ===`
      : BASE_SYSTEM_PROMPT

    const contents = messages.map((msg: { role: string; text: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }))

    // Try each model in order, skip rate-limited ones
    let lastRetryAfter = 60
    for (const model of MODELS) {
      const result = await tryModel(model, contents, fullSystemPrompt, apiKey)

      if (result.text) {
        return NextResponse.json({ text: result.text })
      }

      if (result.rateLimited) {
        lastRetryAfter = result.retryAfter ?? 60
        continue // try next model
      }

      break
    }

    // All models failed or rate-limited
    return NextResponse.json(
      {
        error: 'rate_limited',
        retryAfter: lastRetryAfter,
        text: `⏳ FlyMetric AI is currently busy. Please wait about ${lastRetryAfter} seconds and try again.\n\nThis happens when the free tier API quota is temporarily reached. Your question will be answered shortly!`,
      },
      { status: 429 }
    )
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
