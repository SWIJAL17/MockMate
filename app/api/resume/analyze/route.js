import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { MockmateGenAI as GoogleGenAI } from '@/lib/mockmate/ai-client'
import { getDb } from '@/lib/mockmate/db'
import { auth } from '@/auth'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id || session.user.email

    const body = await request.json()
    const { fileBase64, mimeType, fileName, resumeText, jobDescription } = body

    if (!jobDescription || (!fileBase64 && !resumeText)) {
      return NextResponse.json(
        { error: 'Please provide both a resume file (or text) and a target job description.' },
        { status: 400 }
      )
    }

    const contents = []
    
    // Add resume content (either base64 document or plain text)
    if (fileBase64 && mimeType && mimeType !== 'text/plain') {
      const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64
      contents.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      })
    } else if (resumeText || (fileBase64 && mimeType === 'text/plain')) {
      const text = resumeText || Buffer.from(fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64, 'base64').toString('utf-8')
      contents.push(`CANDIDATE RESUME CONTENT:\n${text}`)
    }

    contents.push(`TARGET JOB DESCRIPTION:\n${jobDescription}`)

    const prompt = `You are a Principal Technical Recruiter, Enterprise ATS (Applicant Tracking System) Architecture Algorithm, and Senior Hiring Manager with over 15 years of industry experience.
Perform a DEEP, RIGOROUS, and UNBIASED evaluation of the candidate's resume against the target job description.

CRITICAL ATS SCORING RULES:
1. Be fair, balanced, and objective according to real-world enterprise ATS screening standards (e.g., Workday, Greenhouse, Lever).
2. Evaluate functional skills, transferable experience, and technical alignment. Do not penalize candidates for minor keyword formatting or synonym differences (e.g., 'Node.js' vs 'Node' or 'React.js' vs 'React').
3. Award scores between 75% and 90% for solid candidates who meet the majority of core requirements. Reserve scores below 60% only for resumes with significant functional mismatches or major keyword gaps.
4. Extract the full text of the resume cleanly into markdown format in 'extractedResumeText' so the candidate can edit it directly in an interactive editor.

You MUST respond ONLY with a valid JSON object (no introductory text, no markdown formatting outside the JSON, no code fences if possible). The JSON MUST follow this exact schema:
{
  "atsScore": integer between 0 and 100 representing the honest, rigorous ATS compatibility percentage,
  "summary": "A candid executive summary of candidate fit, highlighting major strengths and critical disqualifiers or keyword gaps.",
  "extractedResumeText": "The entire text of the candidate's resume extracted cleanly and organized with markdown headings (# Name, ## Professional Summary, ## Skills, ## Work Experience, ## Education, etc.) so it can be edited live.",
  "matchedKeywords": ["array", "of", "hard/soft skills", "present", "in", "both", "resume", "and", "job description"],
  "missingKeywords": ["array", "of", "essential", "skills/technologies", "required", "by", "job description", "but", "missing", "from", "resume"],
  "improvements": [
    {
      "area": "Specific section or skill gap to improve",
      "suggestion": "Clear, senior-architect level advice on how to improve this area.",
      "beforeAfter": "Before: <example weak bullet from resume>\\nAfter: <strong, quantified, high-impact rewritten bullet incorporating required keywords>"
    }
  ],
  "courseRecommendations": [
    {
      "title": "Exact name of a top-tier course or certification (e.g. AWS Certified Solutions Architect Associate, CKA Kubernetes)",
      "platform": "Platform name (e.g. Udemy, Coursera, Educative, AWS Training)",
      "reason": "Why this specific course fixes a critical ATS gap on their resume.",
      "skill": "The target keyword/technology mastered"
    }
  ],
  "projectRecommendations": [
    {
      "title": "Name of an architectural, enterprise-grade portfolio project to build",
      "techStack": "Modern tech stack required (incorporating missing keywords)",
      "description": "2-sentence technical architecture description of what to build and deploy.",
      "atsImpact": "How adding this project bullet point to their resume will directly boost their ATS score by proving real-world competency."
    }
  ],
  "mockQuestions": [
    {
      "question": "A tough, realistic interview question the hiring manager will ask to probe the candidate's biggest keyword gaps or project claims.",
      "rationale": "Why an interviewer asks this (e.g., testing missing skill X or challenging scalability of project Y).",
      "tip": "How to structure an elite STAR-method response to win over the interviewer."
    }
  ]
}
Ensure there are exactly 3 to 5 items in 'improvements', exactly 2 to 3 items in 'courseRecommendations', exactly 2 items in 'projectRecommendations', and exactly 3 items in 'mockQuestions'. Make the bullet rewrites extremely punchy and quantifiable.`

    contents.push(prompt)

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const response = await ai.models.generateContent({
      model,
      contents,
    })

    let rawText = response.text || ''
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim()

    let analysisData
    try {
      analysisData = JSON.parse(rawText)
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', rawText)
      return NextResponse.json(
        { error: 'AI generated invalid JSON analysis. Please try again with a clearer file.' },
        { status: 502 }
      )
    }

    // Apply deterministic hybrid ATS scoring calibration based on actual keyword matching
    if (analysisData && Array.isArray(analysisData.matchedKeywords) && Array.isArray(analysisData.missingKeywords)) {
      const matchedCount = analysisData.matchedKeywords.length
      const missingCount = analysisData.missingKeywords.length
      const totalKeywords = matchedCount + missingCount
      if (totalKeywords > 0) {
        // Deterministic formula: Base 40 + up to 60 points based on keyword coverage ratio
        const keywordScore = Math.round(40 + 60 * (matchedCount / totalKeywords))
        // Average the LLM score with the deterministic keyword score to stabilize fluctuations
        const llmScore = typeof analysisData.atsScore === 'number' ? analysisData.atsScore : keywordScore
        analysisData.atsScore = Math.min(100, Math.max(0, Math.round((llmScore * 0.4) + (keywordScore * 0.6))))
      }
    }

    const now = new Date()
    const analysisDoc = {
      id: uuidv4(),
      userId,
      fileName: fileName || 'Uploaded Resume',
      jobDescriptionSnippet: jobDescription.substring(0, 150) + '...',
      atsScore: analysisData.atsScore || 0,
      summary: analysisData.summary || '',
      extractedResumeText: analysisData.extractedResumeText || resumeText || '',
      matchedKeywords: analysisData.matchedKeywords || [],
      missingKeywords: analysisData.missingKeywords || [],
      improvements: analysisData.improvements || [],
      courseRecommendations: analysisData.courseRecommendations || [],
      projectRecommendations: analysisData.projectRecommendations || [],
      mockQuestions: analysisData.mockQuestions || [],
      createdAt: now,
    }

    const db = await getDb()
    await db.collection('resume_analyses').insertOne(analysisDoc)

    return NextResponse.json({ ok: true, analysis: analysisDoc }, { status: 200 })
  } catch (err) {
    console.error('Resume analysis error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to analyze resume. Please try again later.' },
      { status: 500 }
    )
  }
}
