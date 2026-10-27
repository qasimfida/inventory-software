import { productDetailId } from '@inventory/api-client';
import { View } from 'react-native';
import { hasPermission } from '@inventory/contracts';
import { overviewDestination, workspaceRoutes } from '@inventory/api-client';
import { WarehouseSelect } from '../ui/WarehouseSelect';
import { IconAction } from '../ui/IconAction';
import { Text } from '../ui/Themed';
import { metrics } from '../ui/metrics';
import { useTheme } from '../theme';
import { useWorkspace } from './WorkspaceContext';
import { useNavigation } from './Navigation';
export function NativeHeader() {
  const theme = useTheme();
  const { path, back } = useNavigation();
  const { business, locked, state, selection, setSelection, locations } = useWorkspace();
  return (
    <View
      style={{
        gap: theme.spacing.small,
        padding: theme.spacing.small,
        borderBottomWidth: metrics.border,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.small }}>
        {path.split('/').filter(Boolean).length > 1 &&
          path !== overviewDestination(business, path === '/admin') && (
            <IconAction disabled={locked} label="Go back" icon="←" onPress={back} />
          )}
        <Text
          accessibilityRole="header"
          style={{ flex: 1, fontSize: metrics.heading, fontWeight: '600' }}
        >
          {workspaceRoutes.find((r) => r.path === path)?.title ??
            (productDetailId(path)
              ? 'Product details'
              : path === '/more'
                ? 'More'
                : path === '/admin/businesses'
                  ? 'Registered businesses'
                  : 'Platform overview')}
        </Text>
      </View>
      {business && hasPermission(business, 'locations.read') && (
        <View style={{ minWidth: 0 }}>
          <WarehouseSelect
            label="Workspace warehouse"
            value={
              selection.length === 1 &&
              state.workspace?.locations.some(
                (location) => location.kind === 'warehouses' && location.id === selection[0],
              )
                ? (selection[0] ?? '')
                : ['/pos', '/cash', '/sales'].includes(path)
                  ? (locations.find((l) => l.kind === 'warehouses' && l.state === 'active')?.id ??
                    '')
                  : ''
            }
            disabled={locked}
            options={[
              ...(['/pos', '/cash', '/sales'].includes(path)
                ? []
                : [{ value: '', label: 'All permitted warehouses' }]),
              ...(state.workspace?.locations ?? [])
                .filter((l) => l.kind === 'warehouses' && l.state === 'active')
                .map((l) => ({ value: l.id, label: l.name })),
            ]}
            onChange={(id) => setSelection(id ? [id] : [])}
          />
        </View>
      )}
    </View>
  );
}
