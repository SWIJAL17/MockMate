import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { MockmateGenAI as GoogleGenAI } from '@/lib/mockmate/ai-client'
import { auth } from '@/auth'
import { getDb } from '@/lib/mockmate/db'

// ---------- Gemini ----------
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

function extractText(response) {
  if (!response) return ''
  if (typeof response.text === 'string') return response.text
  if (typeof response.text === 'function') return response.text()
  try {
    const parts = response?.candidates?.[0]?.content?.parts || []
    return parts.map(p => p.text || '').join('')
  } catch { return '' }
}

async function generateQuestions({ role, level, type, focus, count = 6, resume = '' }) {
  const resumeBlock = resume ? `\n\nCandidate resume/background:\n${resume.slice(0, 4000)}\n\nUse the resume to make questions specific to the candidate's experience (mention their projects/stack when relevant).` : ''
  const prompt = `You are a top-tier interviewer at a FAANG-level company.
Generate exactly ${count} concise, high-signal interview questions for:
- Role: ${role}
- Level: ${level}
- Interview type: ${type}
- Focus areas: ${focus || 'general'}${resumeBlock}

Rules:
- Progressive difficulty (easy -> hard).
- Session ${uuidv4().slice(0, 8)}: craft FRESH questions for this session — do NOT reuse the canonical/textbook questions commonly asked for this role. Vary angles, scenarios, and specifics.
- Return ONLY the questions, one per line.
- NO numbering, NO markdown, NO extra text, NO quotes.
- Each question <= 220 chars, self-contained, specific.`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.7 },
  })
  const text = extractText(response)
  return text
    .split('\n')
    .map(l => l.replace(/^\s*[-\d.)]+\s*/, '').replace(/^"|"$/g, '').trim())
    .filter(Boolean)
    .slice(0, count)
}

async function evaluateAnswer({ role, level, question, answer }) {
  const prompt = `You are a strict but supportive senior interviewer.
Score the candidate's answer on a scale 0-10 and give constructive, specific feedback in 3-5 short bullets (each starting with "* ").
Do NOT include any fields other than "score" and "feedback".

Role: ${role}
Level: ${level}
Question: ${question}
Candidate Answer: ${answer || '(no answer)'}`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          feedback: { type: 'string' },
        },
        required: ['score', 'feedback'],
      },
    },
  })
  const raw = extractText(response) || '{}'
  try {
    const p = JSON.parse(raw)
    return {
      score: Math.max(0, Math.min(10, Math.round(Number(p.score) || 0))),
      feedback: String(p.feedback || ''),
    }
  } catch (e) {
    console.error('Feedback JSON parse error:', e, raw)
    return { score: 0, feedback: 'Could not parse feedback.' }
  }
}

async function generateFinalReport({ role, level, qas }) {
  const prompt = `You are a hiring manager producing a final interview report.
Based on the transcript below, produce a JSON object with:
- overall: integer 0-100
- summary: 2-3 sentence overall summary
- strengths: 3-5 short specific bullet points
- weaknesses: 3-5 short specific bullet points
- tips: 3-5 short specific improvement tips (actionable)

Be specific and actionable. No generic fluff.

Role: ${role}
Level: ${level}

Transcript:
${qas.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a || '(skipped)'}\nScore: ${x.score ?? 'N/A'}\nNotes: ${x.feedback || ''}`).join('\n\n')}`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          overall: { type: 'number' },
          summary: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
          tips: { type: 'array', items: { type: 'string' } },
        },
        required: ['overall', 'summary', 'strengths', 'weaknesses', 'tips'],
      },
    },
  })
  const raw = extractText(response) || '{}'
  try {
    const p = JSON.parse(raw)
    return {
      overall: Math.max(0, Math.min(100, Math.round(Number(p.overall) || 0))),
      summary: String(p.summary || ''),
      strengths: Array.isArray(p.strengths) ? p.strengths : [],
      weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
      tips: Array.isArray(p.tips) ? p.tips : [],
    }
  } catch (e) {
    console.error('Final report JSON parse error:', e, raw)
    return {
      overall: 0,
      summary: 'Could not generate report. Please try again.',
      strengths: [],
      weaknesses: [],
      tips: [],
    }
  }
}

// ---------- Tavus (Live Video Interviews) ----------
const TAVUS_BASE = 'https://tavusapi.com'
const TAVUS_KEY = process.env.TAVUS_API_KEY
const TAVUS_REPLICA = process.env.TAVUS_REPLICA_ID || 'r9d30b0e55ac' // Luna, phoenix-3

async function tavusRequest(path, options = {}) {
  const res = await fetch(`${TAVUS_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': TAVUS_KEY,
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || `Tavus API ${res.status}`
    throw new Error(msg)
  }
  return data
}

function buildInterviewContext({ role, level, type, focus, resume }) {
  const focusStr = focus ? ` Focus areas: ${focus}.` : ''
  const resumeStr = resume ? `\n\nCandidate resume/background:\n${String(resume).slice(0, 4000)}\n\nUse this to personalize questions to their actual experience when it's relevant.` : ''
  return `You are a world-class senior technical interviewer at a top FAANG-level company conducting a real mock interview. This is a MOCK interview to help the candidate improve.

Role: ${role}
Level: ${level}
Interview type: ${type}.${focusStr}${resumeStr}

Rules:
- Introduce yourself briefly, then start immediately.
- Ask ONE focused question at a time. Wait for the candidate's answer.
- After each answer, give ONE sentence of specific, actionable feedback, then ask the next question.
- Progressive difficulty (easy -> hard).
- Cover ~5-6 questions total across relevant areas for this role and type.
- Be warm but rigorous. Push back if the answer is vague. Ask clarifying follow-ups when useful.
- Keep your utterances SHORT (2-3 sentences max) to feel like a real conversation.
- After the last question, give a 3-sentence wrap-up: overall impression, top strength, top area to improve.
- Do NOT lecture. Ask, listen, briefly react, next question.`
}

function buildInterviewGreeting({ role, level }) {
  return `Hi! I'm your MockMate interviewer today. We'll do a quick mock ${level} ${role} interview - expect around five questions. Ready when you are! Please start by briefly introducing yourself.`
}

async function fetchTavusConversationDetails(conversationId) {
  return tavusRequest(`/v2/conversations/${conversationId}?verbose=true`)
}

async function generateLiveReport({ role, level, transcript, perception }) {
  const transcriptText = transcript
    .map(t => `${(t.role || 'unknown').toUpperCase()}: ${t.content}`)
    .join('\n\n')
  const prompt = `You are a hiring manager producing a final interview report from a LIVE voice interview transcript.

Role: ${role}
Level: ${level}
${perception ? `\nInterviewer's visual observations about the candidate:\n${perception}\n` : ''}
Live interview transcript (ASSISTANT = the AI interviewer, USER = the candidate):
${transcriptText}

Instructions:
- Base your evaluation ONLY on the candidate's spoken answers (role='user').
- If the candidate barely spoke or gave no substantive answers, score low and say so honestly in the summary.
- Consider verbal communication quality, clarity, and confidence \u2014 this was a LIVE spoken interview.
- questionsCovered should be a list of the topics/questions the interviewer actually asked.
- Be specific and actionable. No generic fluff.

Return JSON matching the given schema.`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          overall: { type: 'number' },
          summary: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
          tips: { type: 'array', items: { type: 'string' } },
          questionsCovered: { type: 'array', items: { type: 'string' } },
        },
        required: ['overall', 'summary', 'strengths', 'weaknesses', 'tips', 'questionsCovered'],
      },
    },
  })
  const raw = extractText(response) || '{}'
  try {
    const p = JSON.parse(raw)
    return {
      overall: Math.max(0, Math.min(100, Math.round(Number(p.overall) || 0))),
      summary: String(p.summary || ''),
      strengths: Array.isArray(p.strengths) ? p.strengths : [],
      weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
      tips: Array.isArray(p.tips) ? p.tips : [],
      questionsCovered: Array.isArray(p.questionsCovered) ? p.questionsCovered : [],
    }
  } catch (e) {
    console.error('Live report JSON parse error:', e, raw)
    return {
      overall: 0,
      summary: 'Could not generate live report. Please try again.',
      strengths: [],
      weaknesses: [],
      tips: [],
      questionsCovered: [],
    }
  }
}

// Fire-and-forget: polls Tavus for transcript, then generates AI report
async function processLiveReport(db, session) {
  try {
    let transcript = []
    let perception = ''
    // Poll up to ~30s for transcription_ready event
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000))
      let details
      try { details = await fetchTavusConversationDetails(session.conversationId) } catch { continue }
      if (!details?.events?.length) continue
      const txEvent = details.events.find(e => e.event_type === 'application.transcription_ready')
      if (txEvent) {
        transcript = (txEvent.properties?.transcript || []).filter(t => t.role !== 'system')
        const pEvent = details.events.find(e => e.event_type === 'application.perception_analysis')
        if (pEvent) perception = pEvent.properties?.analysis || ''
        break
      }
    }

    // Filter transcript to actual spoken turns only
    const spoken = transcript.filter(t => t.role === 'assistant' || t.role === 'user')
    const candidateSpoke = spoken.some(t => t.role === 'user' && (t.content || '').trim().length > 5)

    if (spoken.length === 0) {
      await db.collection('live_sessions').updateOne({ id: session.id },
        { $set: { reportStatus: 'FAILED', reportError: 'Transcript not available yet. This can happen if the call was very short.' } })
      return
    }
    if (!candidateSpoke) {
      // Save transcript but mark report as unavailable
      await db.collection('live_sessions').updateOne({ id: session.id },
        { $set: {
          reportStatus: 'FAILED',
          reportError: 'Candidate did not speak. No answers to evaluate.',
          transcript: spoken, perception,
        } })
      return
    }

    const report = await generateLiveReport({ role: session.role, level: session.level, transcript: spoken, perception })
    await db.collection('live_sessions').updateOne({ id: session.id },
      { $set: {
        reportStatus: 'READY', transcript: spoken, perception,
        overall: report.overall, summary: report.summary,
        strengths: report.strengths, weaknesses: report.weaknesses,
        tips: report.tips, questionsCovered: report.questionsCovered,
      } })
  } catch (e) {
    console.error('processLiveReport error:', e)
    try {
      await db.collection('live_sessions').updateOne({ id: session.id },
        { $set: { reportStatus: 'FAILED', reportError: e.message || 'Unknown error' } })
    } catch {}
  }
}

// Router additions for Tavus (added below existing routes)
async function handleTavusRoute(request, route, method, db) {
  // ---- Start live interview ----
  if (route === '/live' && method === 'POST') {
    if (!TAVUS_KEY) return handleCORS(NextResponse.json({ error: 'TAVUS_API_KEY not configured' }, { status: 500 }))
    const uid = await getUserId()
    if (!uid) return handleCORS(NextResponse.json({ error: 'Missing user id' }, { status: 401 }))
    const body = await request.json()
    const { role, level, type = 'MIXED', focus, resume } = body
    if (!role || !level) return handleCORS(NextResponse.json({ error: 'role and level required' }, { status: 400 }))

    const context = buildInterviewContext({ role, level, type, focus, resume })
    const greeting = buildInterviewGreeting({ role, level })

    const tavus = await tavusRequest('/v2/conversations', {
      method: 'POST',
      body: JSON.stringify({
        replica_id: TAVUS_REPLICA,
        conversation_name: `MockMate - ${role} (${level})`.slice(0, 60),
        conversational_context: context,
        custom_greeting: greeting,
        properties: {
          max_call_duration: 900, // 15 min cap to protect credits
          participant_left_timeout: 30,
          participant_absent_timeout: 60,
          enable_recording: false,
          enable_transcription: true,
        },
      }),
    })

    const now = new Date()
    const doc = {
      id: uuidv4(),
      userId: uid,
      role, level, type, focus: focus || null,
      conversationId: tavus.conversation_id,
      conversationUrl: tavus.conversation_url,
      status: tavus.status || 'active',
      createdAt: now,
      endedAt: null,
    }
    await db.collection('live_sessions').insertOne(doc)
    return handleCORS(NextResponse.json({ session: clean(doc) }))
  }

  // ---- Get live session ----
  const liveDetail = route.match(/^\/live\/([\w-]+)$/)
  if (liveDetail && method === 'GET') {
    const id = liveDetail[1]
    const uid = await getUserId()
    if (!uid) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const doc = await db.collection('live_sessions').findOne({ id, userId: uid })
    if (!doc) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
    return handleCORS(NextResponse.json({ session: clean(doc) }))
  }

  // ---- Delete live session ----
  const liveDelete = route.match(/^\/live\/([\w-]+)$/)
  if (liveDelete && method === 'DELETE') {
    const id = liveDelete[1]
    const uid = await getUserId()
    if (!uid) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const result = await db.collection('live_sessions').deleteOne({ id, userId: uid })
    if (result.deletedCount === 0) {
      return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
    }
    return handleCORS(NextResponse.json({ ok: true }))
  }

  // ---- End live session ----
  const liveEnd = route.match(/^\/live\/([\w-]+)\/end$/)
  if (liveEnd && method === 'POST') {
    const id = liveEnd[1]
    const uid = await getUserId()
    if (!uid) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const doc = await db.collection('live_sessions').findOne({ id, userId: uid })
    if (!doc) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
    if (doc.status !== 'ended') {
      try {
        await tavusRequest(`/v2/conversations/${doc.conversationId}/end`, { method: 'POST' })
      } catch (e) { console.error('Tavus end error:', e.message) }
      await db.collection('live_sessions').updateOne({ id },
        { $set: { status: 'ended', endedAt: new Date(), reportStatus: 'PROCESSING' } })
      // Fire-and-forget report processing (transcript fetch + Gemini scoring)
      processLiveReport(db, { ...doc, id }).catch(e => console.error('bg report err:', e))
    } else if (!doc.reportStatus || doc.reportStatus === 'FAILED') {
      // Already ended but report not yet generated (or previously failed) — kick off now
      await db.collection('live_sessions').updateOne({ id },
        { $set: { reportStatus: 'PROCESSING', reportError: null } })
      processLiveReport(db, { ...doc, id }).catch(e => console.error('bg report err:', e))
    }
    return handleCORS(NextResponse.json({ ok: true, reportStatus: 'PROCESSING' }))
  }

  // ---- List live sessions ----
  if (route === '/live' && method === 'GET') {
    const uid = await getUserId()
    if (!uid) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const list = await db.collection('live_sessions').find({ userId: uid }).sort({ createdAt: -1 }).limit(50).toArray()
    return handleCORS(NextResponse.json({ sessions: list.map(clean) }))
  }

  return null
}

// ---------- CORS ----------
function handleCORS(response) {
  const origin = process.env.CORS_ORIGINS || process.env.NEXTAUTH_URL || process.env.AUTH_URL || '*'
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Auth-Return-Redirect')
  return response
}
export async function OPTIONS() { return handleCORS(new NextResponse(null, { status: 200 })) }

// ---------- helpers ----------
function clean(doc) {
  if (!doc) return doc
  if (Array.isArray(doc)) return doc.map(clean)
  const { _id, ...rest } = doc
  return rest
}
async function getUserId() {
  const session = await auth()
  return session?.user?.id || session?.user?.email || null
}

// ---------- Router ----------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  // ---- NextAuth delegation if routed through [[...path]] ----
  if (route.startsWith('/auth')) {
    try {
      const { handlers } = await import('@/auth')
      if (method === 'GET' && handlers.GET) {
        const res = await handlers.GET(request)
        return handleCORS(new Response(res.body, res))
      }
      if (method === 'POST' && handlers.POST) {
        const res = await handlers.POST(request)
        return handleCORS(new Response(res.body, res))
      }
    } catch (err) {
      console.error('NextAuth fallback route error:', err)
      return handleCORS(NextResponse.json({ error: 'Auth route error' }, { status: 500 }))
    }
  }

  try {
    const db = await getDb()

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'MockMate API' }))
    }

    // ---- Create interview ----
    if (route === '/interviews' && method === 'POST') {
      const uid = await getUserId()
      if (!uid) return handleCORS(NextResponse.json({ error: 'Missing user id' }, { status: 401 }))
      const body = await request.json()
      const { role, level, type, focus, count = 6, resume } = body
      if (!role || !level || !type) return handleCORS(NextResponse.json({ error: 'role, level, type required' }, { status: 400 }))
      const questionsText = await generateQuestions({ role, level, type, focus, count, resume })
      if (!questionsText.length) return handleCORS(NextResponse.json({ error: 'AI failed to generate questions. Try again.' }, { status: 500 }))
      const now = new Date()
      const questions = questionsText.map((prompt, i) => ({
        id: uuidv4(), order: i, prompt, answer: null, feedback: null, score: null,
      }))
      const doc = {
        id: uuidv4(), userId: uid, role, level, type, focus: focus || null,
        status: 'IN_PROGRESS', overall: null, summary: null,
        strengths: [], weaknesses: [], tips: [],
        questions, createdAt: now, updatedAt: now,
      }
      await db.collection('interviews').insertOne(doc)
      return handleCORS(NextResponse.json({ interview: clean(doc) }))
    }

    // ---- List user interviews ----
    if (route === '/interviews' && method === 'GET') {
      const uid = await getUserId()
      if (!uid) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const list = await db.collection('interviews')
        .find({ userId: uid }).sort({ createdAt: -1 }).limit(200).toArray()
      return handleCORS(NextResponse.json({ interviews: list.map(clean) }))
    }

    // ---- Interview detail ----
    const detailMatch = route.match(/^\/interviews\/([\w-]+)$/)
    if (detailMatch && method === 'GET') {
      const id = detailMatch[1]
      const uid = await getUserId()
      if (!uid) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const doc = await db.collection('interviews').findOne({ id, userId: uid })
      if (!doc) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      return handleCORS(NextResponse.json({ interview: clean(doc) }))
    }

    // ---- Submit answer ----
    const answerMatch = route.match(/^\/interviews\/([\w-]+)\/answer$/)
    if (answerMatch && method === 'POST') {
      const id = answerMatch[1]
      const uid = await getUserId()
      if (!uid) return handleCORS(NextResponse.json({ error: 'Missing user id' }, { status: 401 }))
      const body = await request.json()
      const { questionId, answer } = body
      if (!questionId || !answer) return handleCORS(NextResponse.json({ error: 'questionId and answer required' }, { status: 400 }))
      const doc = await db.collection('interviews').findOne({ id, userId: uid })
      if (!doc) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const q = doc.questions.find(x => x.id === questionId)
      if (!q) return handleCORS(NextResponse.json({ error: 'Question not found' }, { status: 404 }))
      const { score, feedback } = await evaluateAnswer({ role: doc.role, level: doc.level, question: q.prompt, answer })
      const updatedQuestions = doc.questions.map(x => x.id === questionId ? { ...x, answer, feedback, score } : x)
      await db.collection('interviews').updateOne({ id }, { $set: { questions: updatedQuestions, updatedAt: new Date() } })
      return handleCORS(NextResponse.json({ question: { ...q, answer, feedback, score } }))
    }

    // ---- Finalize report ----
    const reportMatch = route.match(/^\/interviews\/([\w-]+)\/report$/)
    if (reportMatch && method === 'POST') {
      const id = reportMatch[1]
      const uid = await getUserId()
      if (!uid) return handleCORS(NextResponse.json({ error: 'Missing user id' }, { status: 401 }))
      const doc = await db.collection('interviews').findOne({ id, userId: uid })
      if (!doc) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const qas = doc.questions.map(q => ({ q: q.prompt, a: q.answer || '', feedback: q.feedback || '', score: q.score }))
      const report = await generateFinalReport({ role: doc.role, level: doc.level, qas })
      await db.collection('interviews').updateOne({ id }, { $set: {
        status: 'COMPLETED', overall: report.overall, summary: report.summary,
        strengths: report.strengths, weaknesses: report.weaknesses, tips: report.tips, updatedAt: new Date(),
      }})
      const updated = await db.collection('interviews').findOne({ id })
      return handleCORS(NextResponse.json({ interview: clean(updated) }))
    }

    // ---- Delete interview ----
    if (detailMatch && method === 'DELETE') {
      const id = detailMatch[1]
      const uid = await getUserId()
      if (!uid) return handleCORS(NextResponse.json({ error: 'Missing user id' }, { status: 401 }))
      await db.collection('interviews').deleteOne({ id, userId: uid })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ---- Tavus live routes ----
    if (route.startsWith('/live')) {
      const tavusResp = await handleTavusRoute(request, route, method, db)
      if (tavusResp) return tavusResp
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
