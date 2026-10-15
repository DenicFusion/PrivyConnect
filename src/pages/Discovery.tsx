import React from 'react';
import { DiscoveryFeed, NIGERIAN_STATES, getVibeStyle } from '../components/DiscoveryFeed';

export { NIGERIAN_STATES, getVibeStyle };

interface DiscoveryProps {
  profile: any;
}

export default function DiscoveryPage({ profile }: DiscoveryProps) {
  return (
    <div className="space-y-6 pb-24 pt-2 max-w-5xl mx-auto">
      <DiscoveryFeed 
        profile={profile} 
        title="Discover" 
        subtitle="Explore real verified connections across Nigeria" 
      />
    </div>
  );
}
