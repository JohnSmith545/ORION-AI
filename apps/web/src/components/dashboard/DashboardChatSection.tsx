import React, { useState, useRef, useEffect } from 'react'
import { trpc as trpcApi } from '../../lib/trpc'
import { useAuth } from '../../hooks/useAuth'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  habitabilityPercent?: number
  citations?: string[]
}

function formatTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Renders basic markdown: **bold**, bullet points (* / -), and numbered lists. */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const Tag = listType
      const cls =
        listType === 'ul'
          ? 'list-disc list-inside space-y-1 mt-2 mb-2 text-white/80'
          : 'list-decimal list-inside space-y-1 mt-2 mb-2 text-white/80'
      elements.push(
        <Tag key={`list-${elements.length}`} className={cls}>
          {currentList}
        </Tag>
      )
      currentList = []
      listType = null
    }
  }

  const formatInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    const regex = /\*\*(.+?)\*\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) parts.push(str.slice(lastIndex, match.index))
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-primary/90">
          {match[1]}
        </strong>
      )
      lastIndex = regex.lastIndex
    }
    if (lastIndex < str.length) parts.push(str.slice(lastIndex))
    return parts
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const bulletMatch = line.match(/^\s*[*-]\s+(.*)/)
    const numberMatch = line.match(/^\s*(\d+)\.\s+(.*)/)

    if (bulletMatch) {
      if (listType !== 'ul') flushList()
      listType = 'ul'
      currentList.push(<li key={`li-${i}`}>{formatInline(bulletMatch[1])}</li>)
    } else if (numberMatch) {
      if (listType !== 'ol') flushList()
      listType = 'ol'
      currentList.push(<li key={`li-${i}`}>{formatInline(numberMatch[2])}</li>)
    } else {
      flushList()
      if (line.trim() === '') {
        elements.push(<br key={`br-${i}`} />)
      } else {
        elements.push(
          <p key={`p-${i}`} className={i > 0 ? 'mt-2' : ''}>
            {formatInline(line)}
          </p>
        )
      }
    }
  }
  flushList()
  return elements
}

export const DashboardChatSection: React.FC = () => {
  const { user } = useAuth()
  const chatMutation = trpcApi.rag.chat.useMutation()
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (messages.length === 0 && user) {
      const t = formatTime()
      const userName = user.displayName || user.email?.split('@')[0] || 'Operative'
      setMessages([
        {
          id: 'ai-initial',
          role: 'assistant',
          content: `Welcome back, ${userName}. Your celestial connection is secure. Awaiting your next space query.`,
          timestamp: t,
        },
      ])
    }
  }, [user, messages.length])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isTyping])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const ts = formatTime()
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: ts,
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    const history = messages.map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: m.content,
    }))

    try {
      const result = await chatMutation.mutateAsync({
        question: trimmed,
        history: history.length > 0 ? history : undefined,
      })
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: result.response,
          timestamp: formatTime(),
          citations: result.citations?.length ? result.citations : undefined,
        },
      ])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed. Try again.'
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `Unable to complete your query: ${errorMessage}`,
          timestamp: formatTime(),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <section className="flex flex-col relative h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto chat-scroll pr-4 space-y-6 flex flex-col justify-end pb-6"
      >
        {messages.length <= 2 && (
          <div className="text-center mb-auto mt-20 opacity-80">
            <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center mx-auto mb-4 animate-pulse-slow bg-primary/5 shadow-glow">
              <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
            </div>
            <h2 className="text-2xl font-display font-light text-white tracking-widest mb-2 drop-shadow-md">
              ORION ONLINE
            </h2>
            <p className="text-xs font-mono text-white/50 max-w-md mx-auto">
              Awaiting celestial query. Accessing deep space neural network.
            </p>
          </div>
        )}

        {messages.map(msg =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end w-full">
              <div className="max-w-[70%]">
                <div className="chat-bubble rounded-2xl rounded-tr-sm p-4 text-sm font-light text-white/95 leading-relaxed">
                  {msg.content}
                </div>
                <div className="text-[9px] text-white/30 text-right mt-1 font-mono uppercase tracking-wider">
                  User // {msg.timestamp ?? '--:--'}
                </div>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start w-full gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/40 flex-shrink-0 flex items-center justify-center mt-1 shadow-[0_0_15px_rgba(0,242,255,0.3)] backdrop-blur-sm">
                <span className="material-symbols-outlined text-primary text-sm">blur_on</span>
              </div>
              <div className="max-w-[70%]">
                <div className="chat-bubble ai rounded-2xl rounded-tl-sm p-5 text-sm font-light text-white/95 leading-relaxed">
                  {renderMarkdown(msg.content)}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <div className="text-[10px] font-mono text-primary/70 uppercase tracking-wider mb-1">
                        Sources
                      </div>
                      <ul className="text-[10px] text-white/50 font-mono space-y-0.5 break-all">
                        {msg.citations.map((src, i) => (
                          <li key={i}>{src}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {msg.habitabilityPercent != null && (
                    <div className="mt-4 p-3 bg-black/40 rounded border border-white/10 flex gap-3 items-center backdrop-blur-md shadow-inner">
                      <span className="material-symbols-outlined text-primary/90">science</span>
                      <div className="flex-1">
                        <div className="text-xs text-primary/90 font-medium mb-1">
                          Habitability Index
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-primary/60 to-primary shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                            style={{ width: `${msg.habitabilityPercent}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-primary font-bold ml-2">
                        {msg.habitabilityPercent}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-[9px] text-primary/60 text-left mt-1 font-mono uppercase tracking-wider flex items-center gap-2">
                  <span>Orion AI // {msg.timestamp ?? '--:--'}</span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_5px_#00f2ff]" />
                </div>
              </div>
            </div>
          )
        )}

        {isTyping && (
          <div className="flex justify-start w-full gap-4 opacity-70">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center mt-1">
              <span className="material-symbols-outlined text-white/40 text-sm">blur_on</span>
            </div>
            <div className="chat-bubble rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 h-10 border border-white/10">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 relative group/input-area">
        <div className="absolute -top-10 left-0 w-full h-10 bg-gradient-to-t from-background-dark to-transparent pointer-events-none" />
        <div className="glass-login p-1.5 rounded-xl border border-white/15 bg-black/60 backdrop-blur-2xl relative overflow-hidden transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_0_25px_rgba(0,242,255,0.15)] focus-within:bg-black/70">
          <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            <button
              type="button"
              className="p-3 rounded-lg text-white/50 hover:text-primary transition-colors hover:bg-white/5"
              aria-label="Add"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="w-full bg-transparent border-none text-white placeholder-white/30 focus:ring-0 px-2 font-light text-sm h-12"
              placeholder="Enter astronomical query..."
              aria-label="Message"
            />
            <button
              type="button"
              className="p-3 rounded-lg text-white/50 hover:text-white transition-colors hover:bg-white/5"
              aria-label="Microphone"
            >
              <span className="material-symbols-outlined text-xl">mic</span>
            </button>
            <button
              type="submit"
              className="p-3 rounded-lg btn-send text-primary hover:text-white group"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-xl group-hover:rotate-[-45deg] transition-transform duration-300">
                send
              </span>
            </button>
          </form>
          <div className="absolute bottom-0 left-0 h-[1px] bg-primary/70 w-0 transition-all duration-500 group-focus-within/input-area:w-full shadow-[0_0_10px_#00f2ff]" />
        </div>
        <div className="text-center mt-2">
          <p className="text-[9px] text-white/30 font-mono">
            Orion AI can make errors. Verify celestial data.
          </p>
        </div>
      </div>
    </section>
  )
}
