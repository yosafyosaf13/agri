'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface AIAvatarProps {
  state: AssistantState
  size?: number
}

const STATE_CONFIG = {
  idle: {
    img: '/avatars/avatar-listening.png',
    ringColor: 'ring-emerald-300',
    badgeBg: 'rgba(31,58,38,0.92)',
    badgeText: '🌱 جاهز',
    glowColor: 'rgba(74,124,89,0.15)',
  },
  listening: {
    img: '/avatars/avatar-listening.png',
    ringColor: 'ring-amber-400',
    badgeBg: 'rgba(245,158,11,0.95)',
    badgeText: '🎙️ يستمع',
    glowColor: 'rgba(245,158,11,0.25)',
  },
  thinking: {
    img: '/avatars/avatar-listening.png',
    ringColor: 'ring-blue-400',
    badgeBg: 'rgba(37,99,235,0.92)',
    badgeText: '💭 يفكر',
    glowColor: 'rgba(37,99,235,0.20)',
  },
  speaking: {
    img: '/avatars/avatar-speaking.png',
    ringColor: 'ring-emerald-500',
    badgeBg: 'rgba(74,124,89,0.95)',
    badgeText: '🔊 يتحدث',
    glowColor: 'rgba(74,124,89,0.30)',
  },
}

export function AIAvatar({ state, size = 96 }: AIAvatarProps) {
  const config = STATE_CONFIG[state]
  const isListening = state === 'listening'
  const isSpeaking = state === 'speaking'
  const isThinking = state === 'thinking'
  const isActive = isListening || isSpeaking || isThinking

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        animate={{
          scale: isActive ? [1, 1.15, 1] : 1,
          opacity: isActive ? [0.4, 0.7, 0.4] : 0.3,
        }}
        transition={{
          duration: isSpeaking ? 1.2 : isListening ? 1.8 : 2.5,
          repeat: isActive ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{ background: config.glowColor }}
      />

      {/* Pulse rings */}
      {(isListening || isSpeaking) && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${
                  isSpeaking ? 'rgba(74,124,89,0.4)' : 'rgba(245,158,11,0.35)'
                }`,
              }}
              animate={{
                scale: [1, 1.8],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Avatar image with smooth transitions */}
      <motion.div
        key={config.img}
        initial={{ scale: 0.9, opacity: 0, rotateY: -15 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 rounded-full overflow-hidden ring-4 ${config.ringColor} bg-white shadow-2xl`}
        style={{ width: size, height: size }}
      >
        <motion.div
          animate={{
            y: isSpeaking ? [0, -3, 0, -2, 0] : isListening ? [0, -2, 0] : 0,
          }}
          transition={{
            duration: isSpeaking ? 0.8 : 2,
            repeat: isSpeaking || isListening ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="w-full h-full"
        >
          <Image
            src={config.img}
            alt={`المساعد الذكي — ${config.badgeText}`}
            fill
            sizes={`${size}px`}
            className="object-cover"
            priority
          />
        </motion.div>
      </motion.div>

      {/* State badge */}
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 8, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold shadow-lg"
          style={{ background: config.badgeBg, color: '#fff' }}
        >
          {config.badgeText}
        </motion.span>
      </AnimatePresence>

      {/* Speaking wave bars — professional audio visualizer */}
      {isSpeaking && (
        <div className="absolute inset-0 z-30 flex items-center justify-center gap-1 pointer-events-none">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.span
              key={i}
              className="w-1 rounded-full bg-emerald-500"
              animate={{
                height: [
                  size * 0.08,
                  size * (0.15 + Math.random() * 0.15),
                  size * 0.08,
                ],
              }}
              transition={{
                duration: 0.4 + i * 0.05,
                repeat: Infinity,
                delay: i * 0.06,
                ease: 'easeInOut',
              }}
              style={{ height: size * 0.1 }}
            />
          ))}
        </div>
      )}

      {/* Thinking dots */}
      {isThinking && (
        <div className="absolute inset-0 z-30 flex items-center justify-center gap-1 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-blue-500"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
