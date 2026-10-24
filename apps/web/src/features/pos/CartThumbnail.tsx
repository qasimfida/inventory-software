import { useState } from 'react';
import { Package } from 'lucide-react';
export function CartThumbnail({ uri, name }: { uri: string | undefined; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="cart-thumbnail">
      {uri && !failed ? (
        <img
          src={uri}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package aria-label={`No image for ${name}`} />
      )}
    </div>
  );
}
