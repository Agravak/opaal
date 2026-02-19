import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkshopStore } from '../../stores/workshop-store'
import { skillTemplates, type SkillTemplate } from '../../lib/skill-templates'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

const TEMPLATE_ICONS: Record<string, (color: string) => React.ReactNode> = {
  code: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  doc: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  palette: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill={color} />
      <circle cx="17.5" cy="10.5" r="0.5" fill={color} />
      <circle cx="8.5" cy="7.5" r="0.5" fill={color} />
      <circle cx="6.5" cy="12.5" r="0.5" fill={color} />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  gear: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  wrench: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
}

export function SkillTemplates() {
  const createFromTemplate = useWorkshopStore((s) => s.createFromTemplate)
  const [selectedTemplate, setSelectedTemplate] = useState<SkillTemplate | null>(null)
  const [skillName, setSkillName] = useState('')
  const [skillPurpose, setSkillPurpose] = useState('')
  const [nameError, setNameError] = useState('')

  const handleSelectTemplate = useCallback((template: SkillTemplate) => {
    setSelectedTemplate(template)
    setSkillName('')
    setSkillPurpose('')
    setNameError('')
  }, [])

  const handleBack = useCallback(() => {
    setSelectedTemplate(null)
    setSkillName('')
    setSkillPurpose('')
    setNameError('')
  }, [])

  const handleNameChange = useCallback((value: string) => {
    // Auto-format: lowercase, replace spaces with hyphens, remove invalid chars
    const formatted = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    setSkillName(formatted)

    if (formatted && !/^[a-z0-9-]+$/.test(formatted)) {
      setNameError('Use lowercase letters, numbers, and hyphens only')
    } else {
      setNameError('')
    }
  }, [])

  const handleCreate = useCallback(() => {
    if (!skillName.trim()) {
      setNameError('Skill name is required')
      return
    }
    if (!/^[a-z0-9-]+$/.test(skillName)) {
      setNameError('Use lowercase letters, numbers, and hyphens only')
      return
    }
    if (!selectedTemplate) return

    const content = selectedTemplate.generate(skillName, skillPurpose)
    createFromTemplate(skillName, content)
  }, [skillName, skillPurpose, selectedTemplate, createFromTemplate])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="h-full flex flex-col items-center justify-center px-8"
    >
      <AnimatePresence mode="wait">
        {!selectedTemplate ? (
          /* ── Template Grid ── */
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="w-full max-w-[600px]"
          >
            <div className="text-center mb-6">
              <h2 className="text-[14px] font-bold text-content-primary tracking-tight mb-1">
                Create a New Skill
              </h2>
              <p className="text-[12px] text-content-tertiary">
                Choose a template to get started
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {skillTemplates.map((template, i) => {
                const IconFn = TEMPLATE_ICONS[template.icon]
                return (
                  <motion.button
                    key={template.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2, ease: EASE }}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectTemplate(template)}
                    className="flex flex-col items-start gap-2.5 p-4 rounded-xl border border-border-subtle bg-surface-elevated/80 hover:border-border-default hover:bg-surface-elevated text-left transition-colors duration-150 group"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-150"
                      style={{
                        background: `${template.accentColor}10`,
                        borderColor: `${template.accentColor}20`,
                      }}
                    >
                      {IconFn && IconFn(template.accentColor)}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-content-primary group-hover:text-accent transition-colors">
                        {template.name}
                      </div>
                      <div className="text-[11px] text-content-tertiary mt-0.5 leading-snug">
                        {template.description}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        ) : (
          /* ── Create Form ── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="w-full max-w-[440px]"
          >
            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[11px] text-content-tertiary hover:text-content-secondary transition-colors mb-4"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to templates
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{
                  background: `${selectedTemplate.accentColor}12`,
                  borderColor: `${selectedTemplate.accentColor}25`,
                }}
              >
                {TEMPLATE_ICONS[selectedTemplate.icon]?.(selectedTemplate.accentColor)}
              </div>
              <div>
                <div className="text-[14px] font-bold text-content-primary">
                  {selectedTemplate.name}
                </div>
                <div className="text-[11px] text-content-tertiary">
                  {selectedTemplate.description}
                </div>
              </div>
            </div>

            {/* Skill name */}
            <div className="mb-4">
              <label className="block text-[10px] font-semibold text-content-tertiary uppercase tracking-wider mb-1.5">
                Skill Name
              </label>
              <input
                type="text"
                value={skillName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="my-skill-name"
                autoFocus
                className={`workshop-metadata-input w-full h-[34px] px-3 text-[13px] text-content-primary placeholder:text-content-tertiary/40 ${
                  nameError ? 'border-red-500/50' : ''
                }`}
              />
              {nameError && (
                <p className="text-[10px] text-red-400 mt-1">{nameError}</p>
              )}
            </div>

            {/* Purpose */}
            <div className="mb-5">
              <label className="block text-[10px] font-semibold text-content-tertiary uppercase tracking-wider mb-1.5">
                What does it do?
              </label>
              <textarea
                value={skillPurpose}
                onChange={(e) => setSkillPurpose(e.target.value)}
                placeholder="Describe the skill's purpose, e.g. 'optimize React component performance by applying memoization patterns'"
                rows={3}
                className="workshop-metadata-input w-full px-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary/40 resize-none leading-relaxed"
              />
            </div>

            {/* Create button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={!skillName.trim()}
              className={`w-full h-[36px] rounded-button flex items-center justify-center gap-2 text-[12px] font-semibold transition-all duration-150 ${
                skillName.trim()
                  ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                  : 'bg-surface-tertiary/60 text-content-tertiary/40 cursor-not-allowed'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Skill
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
