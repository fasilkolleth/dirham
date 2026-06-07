import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, Bot, X } from 'lucide-react'
import { askFinancialQuestion, buildFinancialContext } from '@/services/ai'
import { useEMI } from '@/hooks/useEMI'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useLending } from '@/hooks/useLending'
import { useOwnedProperties, useRentedProperties } from '@/hooks/useProperties'
import { useBudget } from '@/hooks/useBudget'

export function AIChat({ onClose }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: "Hi! I'm your finance assistant. Ask me anything about your finances — budgets, EMIs, bank balances, loans, or property."
  }])
  const [loading, setLoading] = useState(false)

  const { emis } = useEMI()
  const { accounts } = useBankAccounts()
  const { lendings } = useLending()
  const { properties: ownedProperties } = useOwnedProperties()
  const { properties: rentedProperties } = useRentedProperties()
  const { budget } = useBudget()

  const send = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)
    try {
      const context = buildFinancialContext({ budget, emis, bankAccounts: accounts, lending: lendings, ownedProperties, rentedProperties })
      const answer = await askFinancialQuestion(question, context)
      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't process that. Check your Gemini API key (VITE_GEMINI_API_KEY) in .env." }])
    } finally {
      setLoading(false)
    }
  }

  // Portal to <body> so the fixed panel is anchored to the viewport, not trapped
  // by any transformed/containing ancestor in the page tree (same as our Modals).
  return createPortal(
    <>
      {/* Dimmed backdrop — click to dismiss (visible behind the desktop drawer) */}
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in" />

      {/* Full-screen sheet on mobile · right-docked drawer on desktop */}
      <div className="fixed z-50 flex flex-col overflow-hidden bg-[var(--bg)] inset-0 animate-slide-up md:left-auto md:right-0 md:inset-y-0 md:w-full md:max-w-[440px] md:border-l md:border-[var(--border)] md:shadow-[var(--shadow-xl)] md:animate-slide-in-right">

      {/* Header */}
      <div className="page-header px-4 pt-safe flex items-center gap-3 h-14 shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)' }}
        >
          <Bot size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-1)]">Finance Assistant</p>
          <p className="text-xs text-[var(--text-3)]">Powered by Gemini</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-[var(--radius-xl)] px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'rounded-br-[var(--radius-sm)] text-white' : 'rounded-bl-[var(--radius-sm)] bg-[var(--surface)] text-[var(--text-1)] border border-[var(--border)]'
              }`}
              style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)' } : {}}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] rounded-bl-[var(--radius-sm)] px-4 py-3 flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--text-3)] animate-pulse-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
        <div className="flex gap-2 items-end">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about your finances…"
            className="flex-1 h-10 rounded-[var(--radius-lg)] px-3.5 text-sm bg-[var(--surface-2)] text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none border border-[var(--border)] focus:border-[var(--accent)] transition-colors"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 text-white transition-all disabled:opacity-40 active:scale-95"
            style={{ background: 'var(--accent)' }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
      </div>
    </>,
    document.body
  )
}
