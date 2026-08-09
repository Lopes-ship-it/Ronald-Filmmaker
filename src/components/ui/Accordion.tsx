import { useId, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import clsx from "clsx";

export interface AccordionItemData {
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItemData[];
  /** Allow more than one panel open at once. Defaults to single-open. */
  allowMultiple?: boolean;
}

export function Accordion({ items, allowMultiple = false }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const reduce = useReducedMotion();

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = allowMultiple ? new Set(prev) : new Set<string>();
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="divide-y divide-paper-100/10 border-t border-paper-100/10">
      {items.map((item) => (
        <AccordionRow
          key={item.id}
          item={item}
          isOpen={openIds.has(item.id)}
          onToggle={() => toggle(item.id)}
          reduceMotion={Boolean(reduce)}
        />
      ))}
    </div>
  );
}

function AccordionRow({
  item,
  isOpen,
  onToggle,
  reduceMotion,
}: {
  item: AccordionItemData;
  isOpen: boolean;
  onToggle: () => void;
  reduceMotion: boolean;
}) {
  const panelId = useId();

  return (
    <div className="py-1">
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 py-5 text-left"
        >
          <span className="font-display text-lg text-paper-50 md:text-xl">
            {item.question}
          </span>
          <CaretDown
            aria-hidden
            weight="bold"
            size={18}
            className={clsx(
              "shrink-0 text-flare-400 transition-transform duration-300",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={panelId}
            role="region"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-paper-400">
              {item.answer}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
