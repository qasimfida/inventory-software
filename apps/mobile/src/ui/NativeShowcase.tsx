import { CurrencyNotice } from './CurrencyNotice';
import { useDisplayMoney } from './useDisplayMoney';
import { LoadingState as CollectionLoadingState } from './AsyncState';
import { ImportMappingDemo } from './ImportMappingDemo';
import { fontLicense } from '@inventory/design-tokens';
import { FoundationPreferences } from './FoundationPreferences';
import type { PreferencePatch } from '@inventory/contracts';
import { RichTextEditor } from './RichTextEditor';
import { RichDescription } from './RichDescription';
import { SetupCard } from './SetupCard';
import { FilterButton } from './FilterButton';
import { RecordTable } from './RecordTable';
import { FormSection } from './FormSection';
import { RecordCollection } from './RecordCollection';
import { SidePanel } from './SidePanel';
import { LoadMore } from './LoadMore';
import { QuantityControl } from './QuantityControl';
import { StatusBadge } from './StatusBadge';
import { SearchControl } from './SearchControl';
import { SettingSwitch } from './SettingSwitch';
import { EmptyState, LoadingState } from './AsyncState';
import { ScreenHeader, ScreenBody } from './ScreenHeader';
import { RecordDetails } from './RecordDetails';
import { MetricCard } from './MetricCard';
import { DisclosureTrigger } from './DisclosureTrigger';
import { DataRow } from './DataRow';
import { metrics } from './metrics';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Action, Field, Choice } from './Controls';
import { Text } from './Themed';
import { ThemeProvider, useTheme } from '../theme';
import { Surface } from './Surface';
import { AppearanceControl } from './AppearanceControl';
import { ConfirmAction } from './ConfirmAction';
import { CommandForm } from '../components/CommandForm';
export function NativeShowcase() {
  const [preferences, setPreferences] = useState<PreferencePatch>({});
  return (
    <ThemeProvider preview previewPreferences={preferences}>
      <Showcase
        controls={<FoundationPreferences value={preferences} onChange={setPreferences} />}
      />
    </ThemeProvider>
  );
}
function Showcase({ controls }: { controls: ReactNode }) {
  const [description, setDescription] = useState('Example product description');
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [focusExample, setFocusExample] = useState(false);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(1);
  const [value, setValue] = useState('Example');
  const [density, setDensity] = useState('comfortable');
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const money = useDisplayMoney();
  return (
    <View style={{ gap: theme.spacing.small, backgroundColor: theme.colors.background }}>
      <DisclosureTrigger
        expanded={open}
        label="Components / Design system"
        onPress={() => setOpen(!open)}
      />
      <CurrencyNotice />
      <Text>Sample original price (no transaction): {money.formatDecimalPrice('3', 'USD')}</Text>
      <ImportMappingDemo />
      <RecordTable
        label="Example records"
        columns={['Record', 'Status']}
        rows={[{ id: 'demo', cells: ['Example notification', 'Unread'] }]}
      />
      {open && (
        <View
          style={{
            gap: theme.spacing.small,
            borderWidth: metrics.border,
            borderColor: theme.colors.border,
            padding: theme.spacing.medium,
          }}
        >
          <ScreenBody>
            <SetupCard
              navigate={() => {}}
              title="Example setup"
              steps={[
                { id: 'one', title: 'Review components', path: '/dev/components', done: true },
              ]}
            />
            <FormSection title="Grouped form example" defaultOpen>
              <Field label="Section draft" value={value} onChange={setValue} />
            </FormSection>
            <FormSection title="Validation reveals the section" open onOpenChange={() => {}}>
              <Field
                label="Required section field"
                value=""
                onChange={() => {}}
                error="Enter a value before saving."
              />
            </FormSection>
            <Action label="Open example side panel" onPress={() => setPanel(true)} />
            <SidePanel title="Example details" open={panel} onClose={() => setPanel(false)}>
              <Text>
                On tablets, drag the left edge to resize. Screen readers can adjust Drawer width.
              </Text>
              <Text>Local presentation example only.</Text>
            </SidePanel>
            <Text>Loaded {loaded} local example batches</Text>
            <LoadMore
              label="local examples"
              hasMore={loaded < 3}
              onLoad={() => setLoaded((n) => n + 1)}
            />
            <StatusBadge label="In stock" tone="success" />
            <StatusBadge label="Low stock" tone="warning" />
            <StatusBadge label="Out of stock" tone="error" />
            <QuantityControl
              compact
              label="Example quantity"
              value="1"
              onChange={() => {}}
              disabled
            />
            <SearchControl label="Example search" value={search} onChange={setSearch} />
            <SettingSwitch
              label="Example native switch"
              description="Disabled demonstration state."
              value
              disabled
              onChange={() => {}}
            />
            <ScreenHeader
              title="Native component examples"
              description="Local examples only. Appearance uses the same semantic palette as web."
            />
            <RecordDetails
              label="Example transaction details"
              items={[
                { label: 'Reference', value: 'COUNT-EXAMPLE' },
                { label: 'Exact quantity', value: '1234.567890' },
                { label: 'Amount (USD minor units)', value: '9007199254740993' },
              ]}
            />
          </ScreenBody>
          <AppearanceControl />
          {controls}
          <FormSection title="Bundled Geist font license">
            <Text>{fontLicense}</Text>
          </FormSection>
          <LoadingState message="Loading local example…" />
          <EmptyState message="No local example records." />
          <Surface muted>
            <Text>Muted surface · local example</Text>
          </Surface>
          <Action label="Show focused field example" onPress={() => setFocusExample(true)} />
          {focusExample && (
            <Field autoFocus label="Focused field example" value={value} onChange={setValue} />
          )}
          <Field label="Native example field" value={value} onChange={setValue} />
          <Choice
            label="Example density"
            value={density}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
            onChange={setDensity}
          />
          <Field
            label="Native read-only reference"
            value="REF-EXAMPLE"
            readOnly
            onChange={() => {}}
          />
          <Field
            trailing={<Text accessibilityLabel="Invalid value">×</Text>}
            errorAccessory={<Text accessibilityLabel="Validation information">ⓘ</Text>}
            label="Native invalid example"
            value="Example"
            error="Example linked validation error."
            onChange={() => {}}
          />
          <Action label="Loading example" loading onPress={() => {}} />
          {(['contrast', 'secondary', 'outline', 'ghost', 'link', 'destructive'] as const).map(
            (variant) => (
              <Action
                key={variant}
                label={`${variant} example`}
                variant={variant}
                onPress={() => setValue(variant)}
              />
            ),
          )}
          <Action label="Disabled example" disabled onPress={() => {}} />
          <MetricCard
            label="Example measure"
            value="1234.567890"
            unit="Units · local example"
            primary
          />
          <DataRow label="Exact report example" value="9007199254740993" unit="USD minor units" />
          <CommandForm
            error="Example only: the change was not confirmed. Review the record before retrying."
            inline
            definition={{
              title: 'Preview native command',
              fields: [{ name: 'quantity', label: 'Native exact quantity', value: '1.250000' }],
              submit: (values) => {
                setMessage(`Local preview: ${String(values.quantity)}`);
                return Promise.resolve();
              },
            }}
            run={(work) => {
              void work();
            }}
          />
          <RichTextEditor
            label="Description editor"
            value={description}
            onChange={setDescription}
          />
          <RichDescription value={description} />
          <ScreenHeader
            title="Fixed receipt list"
            actions={
              <Action
                label="Local header action"
                onPress={() => setMessage('Local header action selected')}
              />
            }
          />
          <RecordCollection
            label="loading example"
            allowGrid={false}
            showExport={false}
            items={[]}
            emptyState={<CollectionLoadingState message="Example loading records…" />}
            onOpen={() => {}}
          />
          <RecordCollection
            allowGrid={false}
            label="example receipts"
            items={[
              {
                id: 'receipt',
                title: 'Example receipt',
                subtitle: 'LOCAL-RECEIPT',
                detail: '$12.00',
                status: 'completed',
                tone: 'success',
              },
            ]}
            onOpen={() => setMessage('Local receipt selected')}
          />
          <RecordCollection
            showExport={false}
            toolbar={
              <Action
                label="Refresh local example"
                onPress={() => setMessage('Local example refreshed')}
              />
            }
            label="example records"
            items={[
              {
                id: 'local',
                title: 'Local customer',
                subtitle: 'LOCAL-1',
                detail: 'USD',
                status: 'active',
                tone: 'success',
              },
            ]}
            onOpen={() => setMessage('Selected local customer')}
          />
          <FilterButton
            active={['Status: active']}
            onPress={() => setMessage('Local filter example selected')}
          />
          <Text accessibilityLiveRegion="polite">{message}</Text>
          <ConfirmAction
            label="Confirm local example"
            confirmLabel="Confirm example"
            description="This only changes the local example field."
            onConfirm={() => setValue('Confirmed example')}
          />
          <Text tone="error" accessibilityRole="alert">
            Example validation error. Check the entered value.
          </Text>
          <Text style={{ color: theme.tokens.success }}>Success: example complete.</Text>
          <Text style={{ color: theme.tokens.warning }}>Warning: review before confirming.</Text>
          <Text style={{ color: theme.tokens.info }}>
            Information: no business records are changed.
          </Text>
        </View>
      )}
    </View>
  );
}
