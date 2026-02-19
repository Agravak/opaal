import React, { useState, useCallback, useRef, useMemo, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useWorkshopStore } from '../../stores/workshop-store'
import { useUIStore } from '../../stores/ui-store'
import { useToastStore } from '../../stores/toast-store'
import { SkillValidation } from './SkillValidation'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

/* ── Lazy Monaco ── */
const MonacoEditor = lazy(() => import('@monaco-editor/react'))

export function SkillEditor() {
  const theme = useUIStore((s) => s.theme)
  const activeSkillName = useWorkshopStore((s) => s.activeSkillName)
  const activeSkillDescription = useWorkshopStore((s) => s.activeSkillDescription)
  const activeSkillContent = useWorkshopStore((s) => s.activeSkillContent)
  const activeSkillPath = useWorkshopStore((s) => s.activeSkillPath)
  const saving = useWorkshopStore((s) => s.saving)
  const deleting = useWorkshopStore((s) => s.deleting)
  const updateName = useWorkshopStore((s) => s.updateName)
  const updateDescription = useWorkshopStore((s) => s.updateDescription)
  const updateContent = useWorkshopStore((s) => s.updateContent)
  const save = useWorkshopStore((s) => s.save)
  const deleteSkill = useWorkshopStore((s) => s.deleteSkill)
  const duplicateSkill = useWorkshopStore((s) => s.duplicateSkill)
  const addToast = useToastStore((s) => s.addToast)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Debounce timer for Monaco content changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Monaco theme registration
  const monacoMounted = useRef(false)
  const handleMonacoMount = useCallback((_editor: unknown, monaco: unknown) => {
    if (monacoMounted.current) return
    monacoMounted.current = true
    const m = monaco as {
      editor: {
        defineTheme: (name: string, data: Record<string, unknown>) => void
      }
    }

    m.editor.defineTheme('opaal-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '86efac' },
        { token: 'comment', foreground: '3a3a52' },
        { token: 'type', foreground: 'c4b5fd' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'variable', foreground: '38bdf8' },
      ],
      colors: {
        'editor.background': '#12121c',
        'editor.foreground': '#c8c8e0',
        'editorGutter.background': '#0e0e16',
        'editorLineNumber.foreground': '#3a3a52',
        'editorLineNumber.activeForeground': '#7a7a96',
        'editor.lineHighlightBackground': '#1a1a2e',
        'editor.selectionBackground': '#818cf830',
        'editorOverviewRuler.border': '#00000000',
        'scrollbar.shadow': '#00000000',
        'editor.inactiveSelectionBackground': '#818cf818',
        'editorWidget.background': '#1c1c2c',
        'editorWidget.border': '#262638',
      },
    })

    m.editor.defineTheme('opaal-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '6366f1', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'comment', foreground: 'b0b4bc' },
        { token: 'type', foreground: '7c3aed' },
        { token: 'number', foreground: 'd97706' },
        { token: 'variable', foreground: '0284c7' },
      ],
      colors: {
        'editor.background': '#fafbfc',
        'editor.foreground': '#5b6270',
        'editorGutter.background': '#f4f5f7',
        'editorLineNumber.foreground': '#b0b4bc',
        'editorLineNumber.activeForeground': '#5b6270',
        'editor.lineHighlightBackground': '#f0f1f4',
        'editor.selectionBackground': '#6366f130',
        'editorOverviewRuler.border': '#00000000',
        'scrollbar.shadow': '#00000000',
        'editor.inactiveSelectionBackground': '#6366f118',
        'editorWidget.background': '#ffffff',
        'editorWidget.border': '#e2e4e9',
      },
    })
  }, [])

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        updateContent(value || '')
      }, 300)
    },
    [updateContent],
  )

  const handleSave = useCallback(async () => {
    const success = await save()
    if (success) {
      addToast({ variant: 'success', message: 'Skill saved successfully' })
    } else {
      addToast({ variant: 'error', message: 'Failed to save skill' })
    }
  }, [save, addToast])

  const handleDuplicate = useCallback(async () => {
    const success = await duplicateSkill()
    if (success) {
      addToast({ variant: 'info', message: 'Skill duplicated - save to create a new copy' })
    }
  }, [duplicateSkill, addToast])

  const handleDelete = useCallback(async () => {
    const success = await deleteSkill()
    if (success) {
      addToast({ variant: 'success', message: 'Skill deleted' })
    } else {
      addToast({ variant: 'error', message: 'Failed to delete skill' })
    }
    setShowDeleteConfirm(false)
  }, [deleteSkill, addToast])

  // Determine if this is a read-only (globally installed) skill
  const isReadOnly = activeSkillPath !== null && (activeSkillPath.includes('settings/skills') || activeSkillPath.includes('settings\\skills'))

  // Description character count
  const descCharCount = activeSkillDescription.length
  const descOverLimit = descCharCount > 500

  // Markdown component overrides
  const markdownComponents = useMemo(
    () => ({
      a: ({ children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
        <a {...rest} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
    }),
    [],
  )

  // Extract body content for preview (skip frontmatter)
  const previewContent = useMemo(() => {
    const match = activeSkillContent.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)
    return match ? match[1] : activeSkillContent
  }, [activeSkillContent])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="h-full flex flex-col min-h-0"
    >
      {/* ── Read-Only Banner ── */}
      {isReadOnly && (
        <div className="px-4 py-2 border-b border-border-subtle shrink-0 bg-amber-500/5">
          <div className="flex items-center gap-2 text-[11px] text-amber-500 font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            This is a globally installed skill (read-only)
          </div>
        </div>
      )}

      {/* ── Metadata Bar ── */}
      <div className="px-4 py-3 border-b border-border-subtle shrink-0 space-y-2">
        <div className="flex items-center gap-3">
          {/* Name input */}
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-semibold text-content-tertiary uppercase tracking-wider mb-1">
              Name
            </label>
            <input
              type="text"
              value={activeSkillName}
              onChange={(e) => {
                if (debounceRef.current) clearTimeout(debounceRef.current)
                updateName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
              }}
              placeholder="skill-name"
              className="workshop-metadata-input w-full h-[30px] px-2.5 text-[13px] font-medium text-content-primary placeholder:text-content-tertiary/40"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold text-content-tertiary uppercase tracking-wider">
              Description
            </label>
            <span
              className={`text-[9px] font-mono tabular-nums ${
                descOverLimit ? 'text-red-400' : 'text-content-tertiary/50'
              }`}
            >
              {descCharCount}/500
            </span>
          </div>
          <textarea
            value={activeSkillDescription}
            onChange={(e) => {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              updateDescription(e.target.value)
            }}
            placeholder='Use when...'
            rows={2}
            className="workshop-metadata-input w-full px-2.5 py-1.5 text-[12px] text-content-primary placeholder:text-content-tertiary/40 resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* ── Editor + Preview Split ── */}
      <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-border-subtle">
        {/* Monaco Editor (left) */}
        <div className="min-h-0 relative">
          <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5">
            <div className="w-[6px] h-[6px] rounded-full bg-content-tertiary/20" />
            <span className="text-[9px] font-semibold text-content-tertiary/40 uppercase tracking-wider">
              Editor
            </span>
          </div>
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-[80%] h-[60%] prompt-monaco-skeleton rounded-lg" />
              </div>
            }
          >
            <MonacoEditor
              value={activeSkillContent}
              language="markdown"
              theme={theme === 'dark' ? 'opaal-dark' : 'opaal-light'}
              onMount={handleMonacoMount}
              onChange={handleContentChange}
              options={{
                readOnly: isReadOnly,
                minimap: { enabled: false },
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingStrategy: 'advanced',
                fontSize: 12,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                lineHeight: 22,
                padding: { top: 28, bottom: 16 },
                renderLineHighlight: 'gutter',
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                folding: true,
                foldingStrategy: 'indentation',
                guides: { indentation: false },
              }}
            />
          </Suspense>
        </div>

        {/* Live Preview (right) */}
        <div className="min-h-0 flex flex-col">
          <div className="px-4 pt-2 pb-1 flex items-center gap-1.5 shrink-0">
            <div className="w-[6px] h-[6px] rounded-full bg-emerald-400/40" />
            <span className="text-[9px] font-semibold text-content-tertiary/40 uppercase tracking-wider">
              Preview
            </span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-3">
            {previewContent.trim() ? (
              <div className="skill-viewer-markdown max-w-[560px]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[[rehypeHighlight, { detect: true }]]}
                  components={markdownComponents}
                >
                  {previewContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[12px] text-content-tertiary/50">
                Start typing to see a preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="px-4 py-2 border-t border-border-subtle flex items-center justify-between shrink-0 gap-4">
        {/* Left: Validation */}
        <div className="min-w-0 flex-1">
          <SkillValidation />
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Duplicate */}
          {activeSkillPath && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDuplicate}
              aria-label="Duplicate skill"
              className="h-[28px] px-3 rounded-button flex items-center gap-1.5 text-[11px] font-medium text-content-secondary hover:text-content-primary border border-border-subtle hover:border-border-default bg-surface-elevated transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Duplicate
            </motion.button>
          )}

          {/* Delete */}
          {activeSkillPath && !isReadOnly && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-red-400 font-medium">Delete?</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    disabled={deleting}
                    className="h-[24px] px-2.5 rounded-button text-[10px] font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Yes'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-[24px] px-2.5 rounded-button text-[10px] font-medium text-content-tertiary hover:text-content-secondary border border-border-subtle transition-colors"
                  >
                    No
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label="Delete skill"
                  className="h-[28px] px-3 rounded-button flex items-center gap-1.5 text-[11px] font-medium text-content-tertiary hover:text-red-400 border border-border-subtle hover:border-red-500/30 bg-surface-elevated transition-all"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </motion.button>
              )}
            </>
          )}

          {/* Save */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            aria-label="Save skill"
            disabled={saving || !activeSkillName || isReadOnly}
            className={`h-[28px] px-4 rounded-button flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-150 ${
              saving
                ? 'bg-accent/60 text-white/80 cursor-wait'
                : activeSkillName && !isReadOnly
                  ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                  : 'bg-surface-tertiary/60 text-content-tertiary/40 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <motion.svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </motion.svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
