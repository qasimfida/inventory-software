import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { AddBusiness } from '../platform-businesses/AddBusiness';
import { useNavigation } from './Navigation';
import { IconAction } from '../ui/IconAction';
import { View } from 'react-native';
import { hasPermission } from '@inventory/contracts';
import { Action, Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { BusinessEditor } from '../organization/BusinessEditor';
import { BusinessPolicy } from '../settings/BusinessPolicy';
import { useWorkspace } from './WorkspaceContext';
import { useTheme } from '../theme';
export function BusinessSettings() {
  const { model, state, business, locked } = useWorkspace(),
    { navigate } = useNavigation(),
    theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text>
        Switch your active business or create a new business. Invitations and member access remain
        controlled by the server.
      </Text>
      {Boolean(state.error) && (
        <Text tone="error" accessibilityRole="alert">
          {state.error}
        </Text>
      )}
      <IconAction
        label="Refresh businesses"
        disabled={state.busy || locked}
        onPress={() => void model.refresh()}
        icon="↻"
      />
      <Choice
        label="Active business"
        value={state.selectedId ?? ''}
        options={state.businesses.map((b) => ({ value: b.id, label: b.name }))}
        disabled={state.busy || locked}
        onChange={(id) => void model.select(id)}
      />
      <WorkspaceSwitcher />
      <AddBusiness />
      {business && (
        <View style={{ gap: theme.spacing.small }}>
          {hasPermission(business, 'business.read') && (
            <Action
              label="Company profile and branding"
              onPress={() => navigate('/settings/company')}
            />
          )}
          {hasPermission(business, 'locations.read') && (
            <Action label="Stores and warehouses" onPress={() => navigate('/settings/locations')} />
          )}
          {hasPermission(business, 'users.read') && (
            <Action label="Team and permissions" onPress={() => navigate('/team')} />
          )}
        </View>
      )}
      {business && hasPermission(business, 'business.write') && (
        <>
          <BusinessEditor
            key={`${business.id}-${business.version}`}
            business={business}
            model={model}
            busy={state.busy}
          />
          <BusinessPolicy business={business} />
        </>
      )}
    </View>
  );
}
