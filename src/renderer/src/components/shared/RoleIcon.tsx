import type { AgentRole } from '../../types/workflow'

export function RoleIcon({ role, size = 14 }: { role: AgentRole; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (role) {
    case 'researcher':
      return <svg {...props}><circle cx="7" cy="7" r="4" /><path d="M10 10l3.5 3.5" /></svg>
    case 'architect':
      return <svg {...props}><path d="M2 14l6-12 6 12" /><path d="M4.5 9h7" /></svg>
    case 'developer':
      return <svg {...props}><polyline points="5 4 2 8 5 12" /><polyline points="11 4 14 8 11 12" /><line x1="9" y1="3" x2="7" y2="13" /></svg>
    case 'reviewer':
      return <svg {...props}><path d="M3 8l3 3 7-7" /></svg>
    case 'documenter':
      return <svg {...props}><rect x="3" y="2" width="10" height="12" rx="1" /><path d="M6 5h4" /><path d="M6 8h4" /><path d="M6 11h2" /></svg>
    case 'tester':
      return <svg {...props}><path d="M6 2v3l-3 5v2a1 1 0 001 1h8a1 1 0 001-1v-2l-3-5V2" /><path d="M5 2h6" /></svg>
    case 'powerpoint_presentation_builder':
      return <svg {...props}><rect x="2.5" y="3" width="11" height="8" rx="1" /><path d="M8 11v2.5" /><path d="M5.5 13.5h5" /><path d="M5 6.5h6" /></svg>
    case 'blog_post_writer':
      return <svg {...props}><path d="M4 3h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M5.5 6h5" /><path d="M5.5 8.5h5" /><path d="M5.5 11h3.5" /></svg>
    case 'excel_expert':
      return <svg {...props}><rect x="3" y="2.5" width="10" height="11" rx="1" /><path d="M6 2.5v11" /><path d="M3 6.5h10" /><path d="M8 8l2.5 3" /><path d="M10.5 8L8 11" /></svg>
    case 'newsletter_writer':
      return <svg {...props}><rect x="2.5" y="4" width="11" height="8" rx="1" /><path d="M2.5 5l5.5 4 5.5-4" /><path d="M5 2.5h6" /></svg>
    case 'seo_content_optimizer':
      return <svg {...props}><circle cx="7" cy="7" r="3.5" /><path d="M10.5 10.5l2.5 2.5" /><path d="M7 5.5v3" /><path d="M5.5 7h3" /></svg>
    case 'meeting_notes_summarizer':
      return <svg {...props}><path d="M3 3.5h10a1 1 0 011 1V10a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V4.5a1 1 0 011-1z" /><path d="M5 6.5h6" /><path d="M5 8.5h4" /></svg>
    case 'research_brief_writer':
      return <svg {...props}><rect x="3" y="2.5" width="8" height="11" rx="1" /><path d="M5 5h4" /><path d="M5 7.5h4" /><path d="M5 10h3" /><circle cx="12.5" cy="11.5" r="1.5" /></svg>
    case 'social_media_caption_writer':
      return <svg {...props}><path d="M2.5 8c0-2.8 2.2-5 5.5-5h4a1.5 1.5 0 010 3H8c-1.1 0-2 .9-2 2s.9 2 2 2h.5" /><path d="M13.5 8c0 2.8-2.2 5-5.5 5H4a1.5 1.5 0 010-3h4c1.1 0 2-.9 2-2s-.9-2-2-2h-.5" /></svg>
    case 'custom':
      return <svg {...props}><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5l3.5-.5z" /></svg>
    default:
      return null
  }
}
