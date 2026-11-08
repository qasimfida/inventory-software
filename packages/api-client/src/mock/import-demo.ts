import { ImportWorkflow } from '../import-workflow.js';
import { importTemplateSchema } from '@inventory/contracts';
import type { ImportTemplate } from '@inventory/contracts';
/** Showcase-only adapter: isolated local state, no network or business writes. */
export function createImportDemo(key: () => string) {
  let templates: ImportTemplate[] = [];
  const model = new ImportWorkflow(
    {
      templates: async () => templates,
      saveTemplate: async (input, current) => {
        const item = importTemplateSchema.parse({
          ...input,
          id: current?.id ?? key(),
          version: (current?.version ?? 0) + 1,
        });
        templates = [...templates.filter((t) => t.id !== item.id), item];
        return item;
      },
      deleteTemplate: async (current) => {
        templates = templates.filter((t) => t.id !== current.id);
      },
      validate: async () => ({ errors: [] }),
      execute: async () => {
        throw new Error('Showcase cannot create products.');
      },
    },
    key,
  );
  return {
    model,
    load: async () => {
      await model.load(
        Uint8Array.from('Code,Title,Amount,Money\nDEMO-01,Example product,12.50,USD', (c) =>
          c.charCodeAt(0),
        ),
        'showcase.csv',
      );
      model.navigate('mapping');
    },
  };
}
