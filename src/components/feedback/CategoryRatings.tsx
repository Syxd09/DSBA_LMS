import { FeedbackTemplateCategory } from '@/types/feedback.types';
import { Label } from '@/components/ui/label';
import { StarRatingInput } from './StarRatingInput';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface CategoryRatingsProps {
  categories: FeedbackTemplateCategory[];
  ratings: Map<string, number>;
  onChange: (categoryId: string, rating: number) => void;
  disabled?: boolean;
}

/**
 * Category ratings list - dynamically loaded from template
 * TEMPLATE IS LOCKED - categories cannot change after feedback creation
 */
export function CategoryRatings({ categories, ratings, onChange, disabled = false }: CategoryRatingsProps) {
  // Sort by display order
  const sortedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => (
        <div key={category.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={`category-${category.id}`} className="text-sm font-medium">
              {category.name}
              {category.weight && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Weight: {category.weight}%)
                </span>
              )}
            </Label>
            {category.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{category.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-4">
            <StarRatingInput
              value={ratings.get(category.id) || 0}
              onChange={(rating) => onChange(category.id, rating)}
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">
              {ratings.get(category.id) || 0}/5
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
