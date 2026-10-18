import { CRISIS_LINES } from '@/lib/safety';

// Help lines shown as soon as a message suggests the user may be in crisis, independent of what
// the model replies. Dismissable; it comes back on the next such message.
export function CrisisHelpBanner({ onClose }: { onClose: () => void }) {
  return (
    <aside className="crisis-help" role="status" aria-live="polite">
      <strong>혼자 견디지 않아도 괜찮아요.</strong>
      <span>지금 많이 힘들다면 바로 이야기할 수 있는 곳이 있어요.</span>
      <div className="crisis-help__lines">
        {CRISIS_LINES.map(line => (
          <span key={line.number}>
            {line.name} <a href={`tel:${line.number}`}>{line.number}</a> ({line.note})
          </span>
        ))}
        <span>
          위급할 때 <a href="tel:119">119</a> · <a href="tel:112">112</a>
        </span>
      </div>
      <button type="button" className="crisis-help__close" onClick={onClose}>
        닫기
      </button>
    </aside>
  );
}
