import { useState, useEffect, type FormEvent } from 'react';
import { watchProductSku, duplicateSkuMessage } from '@inventory/api-client';
import type { createCatalogClient, ProductFieldErrors, SkuFeedback } from '@inventory/api-client';
import type { Product } from '@inventory/contracts';
/** Keeps field feedback, accordion disclosure and advisory checks separate from form markup. */
export function useProductFormFeedback(
  product: Product | null,
  client: ReturnType<typeof createCatalogClient>,
  focusField?: string,
) {
  useEffect(() => {
    if (focusField) {
      const field =
        focusField === 'title'
          ? 'name'
          : focusField === 'categoryId'
            ? 'category'
            : focusField.split('.')[0];
      requestAnimationFrame(() => document.getElementById('product-' + field)?.focus());
    }
  }, [focusField]);
  const [sku, setSku] = useState(product?.sku ?? '');
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [feedback, setFeedback] = useState<SkuFeedback | null>(null);
  useEffect(
    () =>
      watchProductSku(client, sku, product?.id, setFeedback, {
        controller: new AbortController(),
        schedule(work) {
          const timer = setTimeout(work, 350);
          return () => clearTimeout(timer);
        },
      }),
    [client, sku, product?.id],
  );
  const skuError =
    feedback?.value === sku && feedback.state === 'duplicate' ? duplicateSkuMessage : errors.sku;
  const fieldError = (name: string) => (name === 'sku' ? skuError : errors[name]);
  const message = (name: string) =>
    fieldError(name) ? (
      <p aria-live="polite" id={`product-${name}-error`} className="text-sm text-destructive">
        {fieldError(name)}
      </p>
    ) : null;
  const invalidProps = (name: string) => ({
    'aria-invalid': !!fieldError(name),
    'aria-describedby': fieldError(name) ? `product-${name}-error` : undefined,
  });
  const [codesOpen, setCodesOpen] = useState(!!focusField);
  const [settingsOpen, setSettingsOpen] = useState(!!focusField);
  const showErrors = (next: ProductFieldErrors) => {
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first)
      requestAnimationFrame(() =>
        document
          .getElementById(
            `product-${first === 'categoryId' ? 'category' : first === 'trackInventory' ? 'tracking' : first}`,
          )
          ?.focus(),
      );
    if (next.name || next.sku || next.description) setBasicsOpen(true);
    if (next.images || next.barcodes || next.alternativeCodes) setCodesOpen(true);
    if (next.categoryId || next.type || next.trackInventory || next.state) setSettingsOpen(true);
  };
  const [basicsOpen, setBasicsOpen] = useState(true);
  const onChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (!(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ))
      return;
    if (target.name === 'sku') setSku(target.value);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[target.name];
      return next;
    });
  };
  const clearField = (name: string) =>
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  return {
    clearField,
    sku,
    feedback,
    skuError,
    message,
    invalidProps,
    codesOpen,
    setCodesOpen,
    settingsOpen,
    setSettingsOpen,
    showErrors,
    basicsOpen,
    setBasicsOpen,
    onChange,
  };
}
