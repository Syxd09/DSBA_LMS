/**
 * EduMetrics - Marks Input Validation Component
 * U-02: Real-time validation with max marks display and warnings
 * 
 * Features:
 * - Prominent max marks display
 * - Real-time validation (0 ≤ marks ≤ max)
 * - Visual feedback for valid/invalid input
 * - Warning before exceeding limits
 * - Supports decimal input for partial marks
 */

import { useState, useEffect, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface MarksInputProps {
  value: number | string;
  onChange: (value: number | null) => void;
  maxMarks: number;
  label?: string;
  questionLabel?: string;
  disabled?: boolean;
  allowDecimals?: boolean;
  decimalPlaces?: number;
  showPercentage?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const MarksInput = forwardRef<HTMLInputElement, MarksInputProps>(({
  value,
  onChange,
  maxMarks,
  label,
  questionLabel,
  disabled = false,
  allowDecimals = true,
  decimalPlaces = 2,
  showPercentage = false,
  className,
  size = 'md'
}, ref) => {
  const [inputValue, setInputValue] = useState<string>(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  
  // Sync external value changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value?.toString() || '');
    }
  }, [value, isFocused]);
  
  // Validate and parse input
  const parseValue = (input: string): { valid: boolean; value: number | null; warning: string | null } => {
    if (input === '' || input === '-') {
      return { valid: true, value: null, warning: null };
    }
    
    const trimmed = input.trim();
    
    // Allow partial input during typing
    if (trimmed.endsWith('.') && allowDecimals) {
      return { valid: true, value: null, warning: null };
    }
    
    const num = parseFloat(trimmed);
    
    if (isNaN(num)) {
      return { valid: false, value: null, warning: 'Invalid number' };
    }
    
    if (num < 0) {
      return { valid: false, value: null, warning: 'Cannot be negative' };
    }
    
    if (num > maxMarks) {
      return { valid: false, value: null, warning: `Exceeds max (${maxMarks})` };
    }
    
    // Round to decimal places if needed
    const rounded = allowDecimals 
      ? Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
      : Math.round(num);
    
    return { valid: true, value: rounded, warning: null };
  };
  
  const { valid, warning } = parseValue(inputValue);
  const numericValue = parseFloat(inputValue) || 0;
  const percentage = maxMarks > 0 ? (numericValue / maxMarks) * 100 : 0;
  
  // Get status color
  const getStatusColor = () => {
    if (!inputValue) return 'text-muted-foreground';
    if (!valid) return 'text-red-500';
    if (percentage >= 90) return 'text-emerald-500';
    if (percentage >= 70) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    if (percentage >= 35) return 'text-orange-500';
    return 'text-red-500';
  };
  
  // Get percentage label
  const getPercentageLabel = () => {
    if (!inputValue || !valid) return '';
    return `${percentage.toFixed(1)}%`;
  };
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow only valid characters
    if (!allowDecimals && newValue && !/^\d*$/.test(newValue)) {
      return;
    }
    if (allowDecimals && newValue && !/^\d*\.?\d*$/.test(newValue)) {
      return;
    }
    
    setInputValue(newValue);
    
    const parsed = parseValue(newValue);
    if (parsed.valid && parsed.value !== null) {
      onChange(parsed.value);
    } else if (newValue === '') {
      onChange(null);
    }
  };
  
  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
    
    // Clean up input on blur
    const parsed = parseValue(inputValue);
    if (parsed.valid && parsed.value !== null) {
      setInputValue(parsed.value.toString());
      onChange(parsed.value);
    } else if (inputValue === '' || !parsed.valid) {
      setInputValue('');
      onChange(null);
    }
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-sm w-16',
    md: 'h-10 text-base w-20',
    lg: 'h-12 text-lg w-24'
  };
  
  return (
    <div className={cn('space-y-1', className)}>
      {/* Label with max marks */}
      {(label || questionLabel) && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            {questionLabel && <span className="font-mono mr-2">{questionLabel}</span>}
            {label}
          </Label>
          <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded">
            Max: {maxMarks}
          </span>
        </div>
      )}
      
      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              sizeClasses[size],
              'text-center font-mono',
              !valid && inputValue && 'border-red-500 focus:ring-red-500',
              valid && inputValue && 'border-green-500 focus:ring-green-500'
            )}
            placeholder="--"
          />
          
          {/* Validation icon */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            {!valid && inputValue && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            {valid && inputValue && numericValue > 0 && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>
        
        {/* Max display */}
        <span className="text-sm text-muted-foreground">/ {maxMarks}</span>
        
        {/* Percentage display */}
        {showPercentage && inputValue && valid && (
          <span className={cn('text-sm font-medium', getStatusColor())}>
            ({getPercentageLabel()})
          </span>
        )}
      </div>
      
      {/* Warning message */}
      {warning && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </div>
      )}
    </div>
  );
});

MarksInput.displayName = 'MarksInput';

// =============================================================================
// BULK MARKS VALIDATION HELPER
// =============================================================================

export interface MarksValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  totalMarks: number;
  maxTotal: number;
}

export function validateBulkMarks(
  marks: Record<string, number | null>,
  maxMarksMap: Record<string, number>,
  maxTotalMarks?: number
): MarksValidationResult {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];
  let totalMarks = 0;
  let maxTotal = 0;
  
  for (const [field, value] of Object.entries(marks)) {
    const max = maxMarksMap[field] || 0;
    maxTotal += max;
    
    if (value === null || value === undefined) continue;
    
    if (value < 0) {
      errors.push({ field, message: 'Cannot be negative' });
    } else if (value > max) {
      errors.push({ field, message: `Exceeds max (${max})` });
    } else {
      totalMarks += value;
    }
  }
  
  // Check total if limit specified
  if (maxTotalMarks && totalMarks > maxTotalMarks) {
    warnings.push({
      field: '_total',
      message: `Total (${totalMarks}) exceeds section limit (${maxTotalMarks})`
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalMarks,
    maxTotal
  };
}

export default MarksInput;
