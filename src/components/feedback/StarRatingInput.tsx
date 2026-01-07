import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Interactive star rating input (1-5 stars)
 * Follows existing design system - no custom colors
 */
export function StarRatingInput({ value, onChange, disabled = false, size = 'md' }: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const displayRating = hoverRating || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange(rating)}
          onMouseEnter={() => !disabled && setHoverRating(rating)}
          onMouseLeave={() => !disabled && setHoverRating(0)}
          className={cn(
            'transition-colors',
            disabled && 'cursor-not-allowed opacity-50',
            !disabled && 'cursor-pointer'
          )}
          aria-label={`Rate ${rating} out of 5 stars`}
        >
          <Star
            className={cn(
              sizeClasses[size],
              rating <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-none text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}
