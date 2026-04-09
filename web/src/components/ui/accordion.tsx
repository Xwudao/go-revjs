import { useId, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import classes from './accordion.module.scss';

export interface AccordionItemData {
  id: string;
  title: string;
  description?: string;
  iconClassName?: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItemData[];
  defaultOpenId?: string | null;
  className?: string;
}

export function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  const generatedId = useId();
  const [openId, setOpenId] = useState<string | null>(
    defaultOpenId === undefined ? (items[0]?.id ?? null) : defaultOpenId,
  );

  return (
    <div className={clsx(classes.accordion, className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const headerId = `${generatedId}-${item.id}-trigger`;
        const panelId = `${generatedId}-${item.id}-panel`;

        return (
          <section
            key={item.id}
            className={clsx(classes.item, isOpen && classes.itemOpen)}
          >
            <button
              type="button"
              id={headerId}
              className={clsx(classes.trigger, isOpen && classes.triggerOpen)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => {
                setOpenId((current) => (current === item.id ? null : item.id));
              }}
            >
              <span className={clsx(classes.headerMain)}>
                {item.iconClassName && (
                  <span
                    className={clsx(item.iconClassName, classes.itemIcon)}
                    aria-hidden="true"
                  />
                )}
                <span className={clsx(classes.headerText)}>
                  <span className={clsx(classes.itemTitle)}>{item.title}</span>
                  {item.description && (
                    <span className={clsx(classes.itemDescription)}>
                      {item.description}
                    </span>
                  )}
                </span>
              </span>
              <span
                className={clsx(
                  isOpen ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down',
                  classes.chevron,
                )}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <div
                id={panelId}
                className={clsx(classes.panel)}
                role="region"
                aria-labelledby={headerId}
              >
                {item.content}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
