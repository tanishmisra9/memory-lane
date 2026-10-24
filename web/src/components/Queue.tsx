import type { Item } from '../lib/types';
import { stockOf } from '../lib/era';

const MARK: Record<string, string> = { smiled: 'Smiled', neutral: 'Okay', upset: 'Upset' };
// Every item as a numbered strip. Where you are, and what you have already marked, is always visible.
export function Queue({ plan, index, onJump }: { plan: Item[]; index: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Session queue">
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: `repeat(${Math.min(plan.length, 8)}, minmax(0, 1fr))`, gap: 4 }}>
        {plan.map((item, i) => (
          <li key={item.id}>
            <button type="button" onClick={() => onJump(i)} aria-current={i === index ? 'step' : undefined} aria-label={`${item.code}: ${item.title}${item.reaction ? `, ${MARK[item.reaction]}` : ''}`}
              className={`stock-${stockOf(item.kind)}`}
              style={{ width: '100%', minHeight: 44, border: '1.5px solid var(--color-ink)', borderRadius: 2, cursor: 'pointer', font: '700 16px var(--font-display)', position: 'relative',
                background: i === index ? 'var(--stock)' : item.reaction ? 'var(--color-surface)' : 'transparent', color: i === index ? '#fff' : 'var(--color-ink)', boxShadow: i === index ? '2px 2px 0 var(--color-shadow)' : 'none' }}>
              {item.code}
              {item.reaction && <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, background: item.reaction === 'smiled' ? 'var(--color-green)' : item.reaction === 'upset' ? 'var(--color-red)' : 'var(--color-muted)' }} />}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
