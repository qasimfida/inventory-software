import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        className={`pr-12 ${props.className ?? ''}`}
        type={visible ? 'text' : 'password'}
      />
      <Button
        className="absolute right-1 top-1/2 -translate-y-1/2"
        variant="ghost"
        size="icon"
        disabled={props.disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
