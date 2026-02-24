import React, { useEffect } from 'react'

interface DashboardWelcomeModalProps {
  onClose: () => void
}

export const DashboardWelcomeModal: React.FC<DashboardWelcomeModalProps> = ({ onClose }) => {
  // Speak the welcome greeting when the modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance('Welcome, to Orion')

      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        const premiumVoice =
          voices.find(v => v.name.includes('Google UK English Female')) ||
          voices.find(v => v.name.includes('Samantha')) ||
          voices.find(v => v.name.includes('Zira')) ||
          voices.find(v => v.name.includes('Female') && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en'))

        if (premiumVoice) {
          utterance.voice = premiumVoice
        }

        utterance.pitch = 1
        utterance.rate = 0.9

        window.speechSynthesis.speak(utterance)
      }

      if (window.speechSynthesis.getVoices().length > 0) {
        trySpeak()
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          trySpeak()
          window.speechSynthesis.onvoiceschanged = null
        }
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      window.speechSynthesis.cancel()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40"
      id="welcome-modal"
    >
      <div className="relative w-full max-w-xl glass-panel border border-primary/30 bg-[#0a0a14]/60 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.15)]">
        <div className="absolute inset-0 z-0 opacity-20 bg-cosmos pointer-events-none"></div>
        <div className="absolute inset-0 z-0 opacity-10 star-field pointer-events-none"></div>
        <div className="relative z-10 p-8 md:p-12 flex flex-col items-center text-center">
          <div className="mb-8 group">
            <div className="inline-flex items-center justify-center relative mb-4">
              <span className="material-symbols-outlined text-5xl text-primary font-thin drop-shadow-[0_0_15px_rgba(0,242,255,0.8)]">
                blur_on
              </span>
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
            </div>
            <h2 className="font-display text-3xl tracking-[0.4em] font-light text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
              ORION<span className="font-bold">AI</span>
            </h2>
          </div>
          <h3 className="text-lg font-display text-white/90 mb-4 tracking-wide leading-relaxed">
            Welcome to the <br />
            <span className="text-primary font-medium uppercase tracking-widest text-sm">
              Orbital Retrieval and Intelligence Observation Network
            </span>
          </h3>
          <p className="text-sm text-white/60 font-light max-w-sm mb-10 leading-relaxed">
            Your Vertex AI-powered gateway to the cosmos. Scientifically grounded astronomical
            intelligence at your fingertips.
          </p>
          <button
            className="relative group px-10 py-4 rounded-full bg-primary/10 border border-primary/40 text-primary font-display tracking-[0.2em] text-xs uppercase transition-all duration-300 hover:bg-primary/20 hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] hover:scale-105 active:scale-95 animate-pulse-slow"
            onClick={onClose}
          >
            Begin Exploration
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20"></div>
          </button>
          <div className="mt-8 flex items-center gap-4 opacity-30">
            <span className="text-[8px] font-mono tracking-widest">SYSTEM_ID: ORION_V2</span>
            <div className="w-8 h-[1px] bg-white/20"></div>
            <span className="text-[8px] font-mono tracking-widest">ENCRYPTION: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
