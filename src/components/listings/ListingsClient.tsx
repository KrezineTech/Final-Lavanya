'use client';

import React from 'react';

interface ListingsClientProps {
  initialData?: any[];
}

export default function ListingsClient({ initialData = [] }: ListingsClientProps) {
  return (
    <div>
      <h1>Listings</h1>
      {/* TODO: Implement listings display */}
    </div>
  );
}
