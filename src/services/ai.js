// AI service — backed by Google Gemini (free tier).
// Get a key at https://aistudio.google.com/apikey and set VITE_GEMINI_API_KEY in .env
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const callAI = async (systemPrompt, userMessage, maxTokens = 1024) => {
  if (!GEMINI_API_KEY) {
    const e = new Error('Missing Gemini API key')
    e.code = 'no_key'
    throw e
  }

  const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const e = new Error(`Gemini API error (${response.status}): ${body.slice(0, 200)}`)
    if (response.status === 429) e.code = 'rate_limit'
    else if (response.status === 401 || response.status === 403) e.code = 'auth'
    throw e
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export const generateMonthlySummary = async (financialData) => {
  const system = `You are a personal finance advisor. Analyze the user's financial data for the current month and provide a concise, actionable summary in 2-3 sentences. Be specific with numbers. Use AED as the currency. Tone: friendly and constructive.`

  const user = `Here is my financial data for this month:\n\n${JSON.stringify(financialData, null, 2)}\n\nPlease provide a brief monthly summary with key insights.`

  return callAI(system, user, 512)
}

export const askFinancialQuestion = async (question, financialData) => {
  const system = `You are a helpful personal finance assistant. The user has provided their financial data. Answer their questions accurately and concisely based on the data. Use AED as the default currency unless asked otherwise. Format numbers clearly. If the data doesn't contain the answer, say so honestly.`

  const user = `Financial Data:\n${JSON.stringify(financialData, null, 2)}\n\nQuestion: ${question}`

  return callAI(system, user, 1024)
}

export const buildFinancialContext = ({ budget, emis, bankAccounts, lending, ownedProperties, rentedProperties }) => {
  const now = new Date()
  return {
    currentDate: now.toISOString().split('T')[0],
    currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    budget: budget || {},
    emis: emis || [],
    bankAccounts: bankAccounts || [],
    totalBankBalance: (bankAccounts || []).reduce((s, a) => s + (a.balance || 0), 0),
    lending: lending || [],
    totalLentOut: (lending || []).filter(l => l.status !== 'settled').reduce((s, l) => s + (l.balanceRemaining || 0), 0),
    ownedProperties: ownedProperties || [],
    rentedProperties: rentedProperties || [],
  }
}
