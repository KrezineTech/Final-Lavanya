import React from 'react';

interface FavouriteButtonProps {
  productId: string;
  className?: string;
}

export default function FavouriteButton({ productId, className }: FavouriteButtonProps) {
  return (
    <button className={className} aria-label="Add to favourites">
      ♥
    </button>
  );
}
