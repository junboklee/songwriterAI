import Link from 'next/link';

import { FREE_TOOLS } from '@/lib/freeTools';

type AiDownNoticeProps = {
  message: string;
  // Shown before anything is sent (a boxed status message) rather than under a failed send.
  upfront?: boolean;
};

// Points to the free tools that work without the AI. They open in a new tab so the conversation
// and the typed message stay where they are.
export function AiDownNotice({ message, upfront = false }: AiDownNoticeProps) {
  return (
    <div className={`ai-notice${upfront ? ' ai-notice--upfront' : ''}`} role={upfront ? 'status' : undefined}>
      <p>{message}</p>
      <ul>
        {FREE_TOOLS.map(tool => (
          <li key={tool.href}>
            <Link href={tool.href} target="_blank" rel="noopener">
              {tool.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
