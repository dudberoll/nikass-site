import { Call02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useRef } from "react";
import { CONTACT_DETAILS } from "../data/contacts";
import type { Product, ProductVariant } from "../data/catalog";

export default function ManagerContactDialog({ product, variant, large = false }: { product: Product; variant: ProductVariant; large?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();

  return <>
    <button className={`store-add-button manager-contact-trigger${large ? " store-add-button-large" : ""}`} type="button" aria-haspopup="dialog" aria-controls={`${id}-dialog`}
      onClick={() => dialog.current?.showModal()}>Заказать у менеджера</button>
    <dialog ref={dialog} id={`${id}-dialog`} className="restock-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
      <button className="restock-close" type="button" aria-label="Закрыть окно" onClick={() => dialog.current?.close()}>×</button>
      <h2 id={`${id}-title`}>Заказать у менеджера</h2>
      <p id={`${id}-description`} className="manager-contact-product">{product.name} {variant.label}</p>
      <p className="restock-hint">Выберите удобный способ связи</p>
      <div className="restock-channels" role="group" aria-label="Связаться с менеджером">
        <a href={CONTACT_DETAILS.phone.href} aria-label={`Позвонить ${CONTACT_DETAILS.phone.label}`} title={`Телефон ${CONTACT_DETAILS.phone.label}`}>
          <HugeiconsIcon icon={Call02Icon} size={32} aria-hidden="true" />
        </a>
        {CONTACT_DETAILS.messengers.map(({ name, href, icon }) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Написать в ${name}`} title={name}>
          <img src={icon} alt="" aria-hidden="true" width={32} height={32} />
        </a>)}
      </div>
    </dialog>
  </>;
}
