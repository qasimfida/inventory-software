import { Text } from '../ui/Themed';
import { useEffect, useState } from 'react';
import { Invalidations, createSyncClient } from '@inventory/api-client';
import { authClient } from '../auth/client';

export function LiveNotice({
  businessId,
  warehouseId,
}: {
  businessId: string;
  warehouseId: string;
}) {
  const [notice, setNotice] = useState(
    'Warehouse notifications reconnect automatically. Refresh documents before posting.',
  );
  useEffect(() => {
    const feed = new Invalidations(
      createSyncClient(authClient.organizationRequest, businessId),
      warehouseId,
      'USD',
      () =>
        setNotice(
          'Warehouse data may have changed. Resume the count or reload the document confirmation to review current status.',
        ),
    );
    void feed.tick();
    const timer = setInterval(() => void feed.tick(), 3000);
    return () => {
      clearInterval(timer);
      feed.stop();
    };
  }, [businessId, warehouseId]);
  return <Text accessibilityLiveRegion="polite">{notice}</Text>;
}
