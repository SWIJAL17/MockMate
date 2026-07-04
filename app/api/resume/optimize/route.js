import { NextResponse } from 'next/server'
import { MockmateGenAI as GoogleGenAI } from '@/lib/mockmate/ai-client'
import { auth } from '@/auth'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, resumeText, missingKeywords, jobDescription } = body

    if (!resumeText || !action) {
      return NextResponse.json(
        { error: 'Resume text and action type are required.' },
        { status: 400 }
      )
    }

    let prompt = ''

    if (action === 'insert_keywords') {
      const keywordsList = Array.isArray(missingKeywords) ? missingKeywords.join(', ') : missingKeywords || 'industry standard DevOps and Cloud keywords'
      prompt = `You are an Executive Resume Architect and Principal ATS Optimization Engineer.
The candidate has the following draft resume:
-----------------------------------------
${resumeText}
-----------------------------------------
The target job description requires or values these critical missing keywords/skills:
[ ${keywordsList} ]
${jobDescription ? `Target Role Context:\n${jobDescription.substring(0, 500)}` : ''}

YOUR TASK:
Intelligently, naturally, and honestly integrate/weave these missing keywords into the candidate's existing resume.
- Insert them into the relevant Skills section, Professional Summary, or enhance existing bullet points where the candidate's background logically supports these competencies.
- Do NOT invent fake employers or degrees. Frame their existing engineering achievements to highlight these competencies.
- Ensure the output is formatted cleanly in professional Markdown (# Name, ## Professional Summary, ## Technical Skills, ## Professional Experience, ## Education).

Respond ONLY with the upgraded Markdown resume text. Do NOT wrap in code fences (no \`\`\`markdown), and do NOT include any introductory or concluding remarks.`
    } else if (action === 'fit_one_page') {
      prompt = `You are a Principal Executive Recruiter and Senior Resume Editor at a top tech company.
The candidate's current resume text is too long and exceeds the optimal 1-page length (which is crucial for fast ATS scanning and hiring manager review):
-----------------------------------------
${resumeText}
-----------------------------------------

YOUR TASK:
CONDENSE, TRIM, TIGHTEN, and COMPILE this entire resume so that it fits comfortably on exactly ONE professional page (maximum 450 to 500 words total).

CRITICAL RULES FOR 1-PAGE COMPILATION:
1. Preserve all company names, job titles, dates, degrees, and core hard skills.
2. Remove redundant adjectives, fluff words, passive voice, and outdated/minor responsibilities.
3. Consolidate verbose or multi-sentence bullet points into crisp, high-impact, single-line quantified achievements.
4. Optimize header and section formatting using clean Markdown (# Name, ## Summary, ## Skills, ## Experience, ## Education).

Respond ONLY with the compiled 1-page Markdown resume text. Do NOT wrap in code fences (no \`\`\`markdown), and do NOT include any introductory or concluding commentary.`
    } else {
      return NextResponse.json({ error: 'Invalid optimization action.' }, { status: 400 })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const response = await ai.models.generateContent({
      model,
      contents: [prompt],
    })

    let optimizedText = response.text || ''
    // Strip code fences if Gemini added them despite instructions
    optimizedText = optimizedText.replace(/```markdown\s*/gi, '').replace(/```\s*$/gi, '').trim()

    return NextResponse.json({ ok: true, optimizedText }, { status: 200 })
  } catch (err) {
    console.error('Resume optimize error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to optimize resume with AI.' },
      { status: 500 }
    )
  }
}
