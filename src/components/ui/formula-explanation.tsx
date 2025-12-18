import * as React from "react";
import { Info, Calculator, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Formula definitions for analytics
 */
export const FORMULAS = {
  coAttainment: {
    name: "CO Attainment",
    formula: "CO Attainment = (Students ≥ Target / Total Students) × 100",
    description: "Percentage of students who achieved the target marks for a Course Outcome",
    example: {
      values: { studentsAboveTarget: 35, totalStudents: 50 },
      calculation: "(35 / 50) × 100 = 70%"
    }
  },
  poAttainment: {
    name: "PO Attainment",
    formula: "PO Attainment = Σ(CO Attainment × Correlation) / Σ(Correlation)",
    description: "Weighted average of CO attainments based on CO-PO correlation levels (1, 2, or 3)",
    example: {
      values: { 
        co1: { attainment: 70, correlation: 3 },
        co2: { attainment: 80, correlation: 2 },
        co3: { attainment: 65, correlation: 1 }
      },
      calculation: "(70×3 + 80×2 + 65×1) / (3 + 2 + 1) = 435 / 6 = 72.5%"
    }
  },
  bloomDistribution: {
    name: "Bloom's Level Distribution",
    formula: "Level % = (Questions at Level / Total Questions) × 100",
    description: "Distribution of exam questions across Bloom's taxonomy levels",
    example: {
      values: { remember: 2, understand: 3, apply: 4, analyze: 1 },
      calculation: "Apply: (4 / 10) × 100 = 40%"
    }
  },
  sgpa: {
    name: "SGPA (Semester Grade Point Average)",
    formula: "SGPA = Σ(Credits × Grade Points) / Σ(Credits)",
    description: "Weighted average of grade points for a semester",
    example: {
      values: [
        { subject: "CS101", credits: 4, gradePoint: 9 },
        { subject: "CS102", credits: 3, gradePoint: 8 },
        { subject: "CS103", credits: 3, gradePoint: 10 }
      ],
      calculation: "(4×9 + 3×8 + 3×10) / (4 + 3 + 3) = 90 / 10 = 9.0"
    }
  }
} as const;

type FormulaKey = keyof typeof FORMULAS;

interface FormulaTooltipProps {
  formulaKey: FormulaKey;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Tooltip showing formula explanation on hover
 */
export function FormulaTooltip({ formulaKey, children, className }: FormulaTooltipProps) {
  const formula = FORMULAS[formulaKey];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 cursor-help", className)}>
            {children}
            <Info className="h-4 w-4 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4">
          <div className="space-y-2">
            <p className="font-semibold">{formula.name}</p>
            <code className="block bg-muted px-2 py-1 rounded text-sm">
              {formula.formula}
            </code>
            <p className="text-sm text-muted-foreground">{formula.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FormulaExplanationCardProps {
  formulaKey: FormulaKey;
  showExample?: boolean;
  className?: string;
}

/**
 * Card component showing detailed formula explanation
 */
export function FormulaExplanationCard({ 
  formulaKey, 
  showExample = true,
  className 
}: FormulaExplanationCardProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const formula = FORMULAS[formulaKey];

  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{formula.name}</CardTitle>
        </div>
        <CardDescription>{formula.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-md p-3">
            <code className="text-sm font-mono">{formula.formula}</code>
          </div>
          
          {showExample && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    See Example
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Example Calculation:
                  </p>
                  <pre className="text-sm font-mono text-green-800 dark:text-green-200 whitespace-pre-wrap">
                    {formula.example.calculation}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AnalyticsExplanationPanelProps {
  title: string;
  formulaKeys: FormulaKey[];
  className?: string;
}

/**
 * Panel showing multiple formula explanations
 */
export function AnalyticsExplanationPanel({ 
  title, 
  formulaKeys,
  className 
}: AnalyticsExplanationPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4 mr-1" />
            {isOpen ? "Hide" : "How is this calculated?"}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {formulaKeys.map(key => (
            <FormulaExplanationCard key={key} formulaKey={key} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Inline help button that shows formula on click
 */
export function FormulaHelpButton({ formulaKey }: { formulaKey: FormulaKey }) {
  const [open, setOpen] = React.useState(false);
  const formula = FORMULAS[formulaKey];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="inline-block">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="absolute z-50 bg-popover border rounded-md shadow-lg p-4 max-w-sm mt-1">
        <div className="space-y-2">
          <p className="font-semibold">{formula.name}</p>
          <code className="block bg-muted px-2 py-1 rounded text-sm">
            {formula.formula}
          </code>
          <p className="text-sm text-muted-foreground">{formula.description}</p>
          <div className="pt-2 border-t">
            <p className="text-xs font-medium">Example:</p>
            <code className="text-xs">{formula.example.calculation}</code>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
