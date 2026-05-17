'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  items: FaqItem[];
}

/**
 * Plain accordion — one item open at a time. Native <details> would
 * be lighter still, but a controlled component gives us a smooth
 * chevron rotation and consistent open/close behaviour across
 * browsers' default <details> styling.
 */
export default function Faq({ items }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="spce-faq-list">
      {items.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            className={`spce-faq-item${isOpen ? ' spce-faq-item-open' : ''}`}
          >
            <button
              type="button"
              className="spce-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpenIdx(isOpen ? null : idx)}
            >
              <span>{item.q}</span>
              <ChevronDown size={18} className="spce-faq-chevron" aria-hidden="true" />
            </button>
            {isOpen && <div className="spce-faq-a">{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}
