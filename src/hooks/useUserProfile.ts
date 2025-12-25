import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { UserProfile } from '../types';

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const subscription = supabase
      .channel(`profile_${userId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${userId}` },
        (payload: { new: UserProfile }) => setProfile(payload.new)
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { profile, loading, error };
}