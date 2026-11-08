import type { ImportInput, ImportIssue, ImportMapping, ImportTemplate } from '@inventory/contracts';
import type { createImportClient } from './import-client.js';
import {
  readImportSource,
  suggestedImportMapping,
  mappingIssues,
  mapImportSource,
} from './import-mapping.js';
import type { ImportSource } from './import-mapping.js';
type Client = ReturnType<typeof createImportClient>;
interface ImportState {
  step: 'upload' | 'preview' | 'mapping' | 'review' | 'result';
  source: ImportSource | null;
  mapping: ImportMapping;
  warehouseId: string;
  templates: ImportTemplate[];
  templateId: string;
  templateName: string;
  busy: boolean;
  message: string;
  errors: ImportIssue[];
  validated: boolean;
  uncertain: boolean;
  result: Awaited<ReturnType<Client['execute']>> | null;
}
const emptyMapping = (): ImportMapping => ({
  sku: '',
  name: '',
  description: '',
  price: '',
  currency: '',
  quantity: '',
});
export class ImportWorkflow {
  private state: ImportState = {
    step: 'upload',
    source: null,
    mapping: emptyMapping(),
    warehouseId: '',
    templates: [],
    templateId: '',
    templateName: '',
    busy: false,
    message: '',
    errors: [],
    validated: false,
    uncertain: false,
    result: null,
  };
  private listeners = new Set<() => void>();
  private input: ImportInput | null = null;
  constructor(
    private readonly client: Client,
    private readonly key: () => string,
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private patch(patch: Partial<ImportState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private async run(work: () => Promise<void>) {
    if (this.state.busy) return;
    this.patch({ busy: true, message: '' });
    try {
      await work();
    } catch (error) {
      this.patch({
        message:
          error instanceof Error
            ? error.message
            : 'The operation failed. No automatic retry was made.',
      });
    } finally {
      this.patch({ busy: false });
    }
  }
  loadTemplates = () =>
    this.run(async () => {
      this.patch({ templates: await this.client.templates() });
    });
  load = (bytes: Uint8Array, name: string) => {
    if (this.state.uncertain) return Promise.resolve();
    return this.run(async () => {
      this.input = null;
      this.patch({ validated: false, source: null, step: 'upload', result: null, errors: [] });
      const source = await readImportSource(bytes, name);
      this.input = null;
      this.patch({
        source,
        mapping: suggestedImportMapping(source),
        step: 'preview',
        validated: false,
        errors: [],
        result: null,
        templateId: '',
        templateName: '',
      });
    });
  };
  notice = (message: string) => {
    if (!this.state.busy) this.patch({ message });
  };
  edit = (patch: Partial<Pick<ImportState, 'mapping' | 'warehouseId' | 'templateName'>>) => {
    if (this.state.busy || this.state.uncertain || this.state.result) return;
    this.input = null;
    this.patch({ ...patch, validated: false, errors: [], message: '' });
  };
  navigate = (step: 'preview' | 'mapping') => {
    if (!this.state.busy && !this.state.uncertain && !this.state.result)
      this.patch({ step, validated: false });
  };
  selectTemplate = (id: string) => {
    if (this.state.busy || this.state.uncertain || this.state.result) return;
    const template = this.state.templates.find((t) => t.id === id);
    this.input = null;
    this.patch({
      templateId: id,
      templateName: template?.name ?? '',
      mapping:
        template?.mapping ??
        (this.state.source ? suggestedImportMapping(this.state.source) : emptyMapping()),
      validated: false,
      errors: [],
      message: '',
    });
  };
  saveTemplate = (copy = false) =>
    this.run(async () => {
      const { source, mapping, templateName, templates, templateId } = this.state;
      if (!source || mappingIssues(source, mapping).length)
        throw new Error('Resolve missing or duplicate mappings before saving a template.');
      const current = copy ? undefined : templates.find((t) => t.id === templateId);
      const saved = await this.client.saveTemplate({ name: templateName, mapping }, current);
      this.patch({
        templates: [...templates.filter((t) => t.id !== saved.id), saved].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        templateId: saved.id,
        templateName: saved.name,
        message: 'Mapping template saved for this business.',
      });
    });
  deleteTemplate = () =>
    this.run(async () => {
      const current = this.state.templates.find((t) => t.id === this.state.templateId);
      if (!current) return;
      await this.client.deleteTemplate(current);
      this.patch({
        templates: this.state.templates.filter((t) => t.id !== current.id),
        templateId: '',
        templateName: '',
        message: 'Template deleted. Current column mappings are retained.',
      });
    });
  validate = () =>
    this.run(async () => {
      const { source, mapping, warehouseId } = this.state;
      if (!source) return;
      const issues = mappingIssues(source, mapping);
      if (issues.length) throw new Error(issues.join(' '));
      const mapped = mapImportSource(source, mapping, warehouseId);
      this.patch({ errors: mapped.errors, validated: false, step: 'review' });
      if (mapped.errors.length) return;
      const input = {
        rows: mapped.rows,
        warehouseId: warehouseId || null,
        idempotencyKey: this.key(),
      };
      const response = await this.client.validate(input);
      this.input = response.errors.length ? null : input;
      this.patch({ errors: response.errors, validated: !response.errors.length });
    });
  confirm = () =>
    this.run(async () => {
      if (!this.input || (!this.state.validated && !this.state.uncertain) || this.state.result)
        return;
      const previouslyUncertain = this.state.uncertain;
      try {
        const result = await this.client.execute(this.input);
        this.patch({
          result,
          step: 'result',
          uncertain: false,
          validated: false,
          message:
            'Import completed. All products were created; no records were updated or skipped.',
        });
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0;
        const definitive =
          !previouslyUncertain && status >= 400 && status < 500 && ![408, 429].includes(status);
        this.patch({ validated: false, uncertain: !definitive });
        if (definitive) this.input = null;
        throw new Error(
          definitive
            ? 'Import rejected. No products were created by this attempt. Review the data and validate again.'
            : 'Import outcome is not confirmed. Retry this exact batch to retrieve its result safely; do not start a new import.',
        );
      }
    });
  reset = () => {
    if (!this.state.busy && !this.state.uncertain) {
      this.input = null;
      this.patch({
        source: null,
        step: 'upload',
        mapping: emptyMapping(),
        errors: [],
        validated: false,
        result: null,
        message: '',
        templateId: '',
        templateName: '',
      });
    }
  };
}
