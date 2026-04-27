'use client';

import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateDisplayName } from '@/lib/profile/actions';

interface SettingsFormProps {
  initialDisplayName: string;
}

export function SettingsForm({ initialDisplayName }: SettingsFormProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [loading, setLoading] = React.useState(false);

  const dirty = displayName.trim() !== initialDisplayName;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || loading) return;
    setLoading(true);
    try {
      await updateDisplayName({ display_name: displayName.trim() });
      toast({ title: 'Saved' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="max-w-sm"
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={!dirty || loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
