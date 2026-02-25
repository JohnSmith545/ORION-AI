import React, { useState, useRef, useEffect } from 'react'
import { trpc as trpcApi } from '../../lib/trpc'
import { useAuth } from '../../hooks/useAuth'
import type { CelestialTarget } from './DashboardSidebarRight'

/* ── Web Speech API type declarations ────────────────────────── */
interface SpeechRecognitionResult {
  readonly [index: number]: { transcript: string; confidence: number }
  readonly length: number
  readonly isFinal: boolean
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult
  readonly length: number
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionEngine {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  habitabilityPercent?: number
  citations?: string[]
}

interface DashboardChatSectionProps {
  activeSessionId: string | null
  onSessionCreated: (sessionId: string) => void
  onUpdateTarget?: (target: CelestialTarget) => void
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

export const DashboardChatSection: React.FC<DashboardChatSectionProps> = ({
  activeSessionId,
  onSessionCreated,
  onUpdateTarget,
}) => {
  const { user } = useAuth()
  const chatMutation = trpcApi.rag.chat.useMutation()
  const createSessionMutation = trpcApi.user.createSession.useMutation()
  const addMessagesMutation = trpcApi.user.addMessages.useMutation()
  const utils = trpcApi.useUtils()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0))
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<{ file: File; base64: string }[]>([])
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionEngine | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number>(0)

  // Load session messages when activeSessionId changes
  const { data: sessionData } = trpcApi.user.getSession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  )

  // When session data loads or activeSessionId changes, update messages
  useEffect(() => {
    if (activeSessionId && sessionData) {
      setMessages(
        sessionData.messages.map(
          (
            m: { role: string; content: string; citations?: string[]; timestamp?: string },
            i: number
          ) => ({
            id: `loaded-${i}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            citations: m.citations?.length ? m.citations : undefined,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              : undefined,
          })
        )
      )
    }
  }, [activeSessionId, sessionData])

  // Reset to welcome message when starting a new chat (activeSessionId becomes null)
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([])
    }
  }, [activeSessionId])

  // Show welcome message when messages are empty
  useEffect(() => {
    if (messages.length === 0 && user && !activeSessionId) {
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
  }, [user, messages.length, activeSessionId])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isTyping])

  // Initialize Speech Recognition engine
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition: new () => SpeechRecognitionEngine })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognitionEngine })
        .webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        setInputValue(transcript)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'network') {
          console.warn('Network error: Browser may be blocking speech services.')
        }
        stopListening()
      }

      recognitionRef.current = recognition
    }
  }, [])

  const stopListening = () => {
    setIsListening(false)

    try {
      recognitionRef.current?.stop()
    } catch (e) {
      // Ignore errors if it's already stopped
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    // Safely close the AudioContext only if it is not already closed
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error)
    }

    setAudioData(new Uint8Array(0))
  }

  const toggleListening = async () => {
    if (isListening) {
      stopListening()
    } else {
      if (!recognitionRef.current) {
        alert('Voice to text is not supported in this browser. Please try Chrome or Edge.')
        return
      }

      try {
        // 1. Setup Microphone for the Visualizer
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateVisualizer = () => {
          analyser.getByteFrequencyData(dataArray)
          setAudioData(new Uint8Array(dataArray))
          animationFrameRef.current = requestAnimationFrame(updateVisualizer)
        }
        updateVisualizer()

        // 2. Start Speech Recognition
        setInputValue('')
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error('Mic access denied', err)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return

    const validFiles = selectedFiles.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`File ${f.name} is too large. Max 5MB.`)
        return false
      }
      return true
    })

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1]
        setAttachments(prev => [...prev, { file, base64: base64String }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isListening) stopListening()
    const trimmed = inputValue.trim()
    if (!trimmed && attachments.length === 0) return

    const ts = formatTime()

    // 1. Create a display string that includes the file names
    const fileNames = attachments.map(a => a.file.name).join(', ')
    const displayContent =
      attachments.length > 0 ? `**[Attached: ${fileNames}]**\n\n${trimmed}` : trimmed

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: displayContent, // Shows in UI immediately
      timestamp: ts,
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    const realMessages = messages.filter(m => m.id !== 'ai-initial')
    const history = realMessages.map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: m.content,
    }))

    // Save a copy of current attachments for the API call, then clear UI
    const currentAttachments = [...attachments]
    setAttachments([])

    try {
      const result = await chatMutation.mutateAsync({
        question: trimmed || 'Please analyze the attached files.', // Fallback if they just send an image
        history: history.length > 0 ? history : undefined,
        files:
          currentAttachments.length > 0
            ? currentAttachments.map(a => ({ data: a.base64, mimeType: a.file.type }))
            : undefined,
      })

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: formatTime(),
        citations: result.citations?.length ? result.citations : undefined,
      }
      setMessages(prev => [...prev, aiMsg])

      if (result.telemetry) onUpdateTarget?.(result.telemetry)

      // 2. Persist the DISPLAY content to Firestore, so history remembers the attachments!
      const messagesToSave = [
        { role: 'user' as const, content: displayContent },
        {
          role: 'assistant' as const,
          content: result.response,
          citations: result.citations?.length ? result.citations : undefined,
        },
      ]

      if (activeSessionId) {
        addMessagesMutation.mutate(
          { sessionId: activeSessionId, messages: messagesToSave },
          { onSuccess: () => utils.user.getChatHistory.invalidate() }
        )
      } else {
        const title = trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed
        createSessionMutation.mutate(
          { title, messages: messagesToSave },
          {
            onSuccess: data => {
              onSessionCreated(data.sessionId)
              utils.user.getChatHistory.invalidate()
            },
          }
        )
      }
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
    <section className="flex flex-col relative h-full flex-1 min-h-0 min-w-0 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto chat-scroll pr-4 space-y-6 flex flex-col pb-4"
      >
        {messages.length <= 1 && (
          <div className="text-center mt-auto mb-auto opacity-80">
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

        {/* Multiple Attachments Preview UI */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-lg px-3 py-1.5 text-xs text-white backdrop-blur-md"
              >
                <span className="material-symbols-outlined text-sm text-primary">attach_file</span>
                <span className="truncate max-w-[150px] font-mono">{att.file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="text-white/60 hover:text-red-500 ml-1"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={`glass-login p-1.5 rounded-xl border transition-all duration-300 relative backdrop-blur-2xl focus-within:border-primary/50 focus-within:shadow-[0_0_25px_rgba(0,242,255,0.15)] ${
            isListening
              ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] bg-red-950/10'
              : 'border-white/15 bg-black/60 focus-within:bg-black/70'
          }`}
        >
          <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={e => {
                handleFileChange(e)
                setIsAttachMenuOpen(false)
              }}
            />

            {/* Upward Attachment Menu */}
            <div className="relative">
              {isAttachMenuOpen && (
                <div className="absolute bottom-full mb-3 left-0 bg-black/90 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] min-w-[160px] z-[100] animate-in slide-in-from-bottom-2 fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*'
                        fileInputRef.current.click()
                      }
                    }}
                    className="flex items-center gap-3 text-xs text-white/70 hover:text-white hover:bg-white/10 p-2.5 rounded-lg text-left transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">image</span>
                    Attach Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'application/pdf'
                        fileInputRef.current.click()
                      }
                    }}
                    className="flex items-center gap-3 text-xs text-white/70 hover:text-white hover:bg-white/10 p-2.5 rounded-lg text-left transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-red-400">
                      picture_as_pdf
                    </span>
                    Attach PDF
                  </button>
                </div>
              )}

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                className={`p-3 rounded-lg transition-colors ${
                  attachments.length > 0 || isAttachMenuOpen
                    ? 'text-primary bg-primary/10'
                    : 'text-white/50 hover:text-primary hover:bg-white/5'
                }`}
                aria-label="Add Attachment"
              >
                <span
                  className={`material-symbols-outlined text-xl transition-transform duration-300 ${isAttachMenuOpen ? 'rotate-45' : ''}`}
                >
                  add_circle
                </span>
              </button>
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="w-full bg-transparent border-none text-white placeholder-white/30 focus:ring-0 px-2 font-light text-sm h-12"
              placeholder="Enter astronomical query..."
              aria-label="Message"
            />
            {isListening && (
              <div className="flex items-center gap-0.5 px-2 h-8">
                {Array.from(audioData)
                  .slice(0, 12)
                  .map((val, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(4, (val / 255) * 100)}%` }}
                    />
                  ))}
              </div>
            )}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-lg transition-colors ${
                isListening
                  ? 'text-red-500 bg-red-500/10 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
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
