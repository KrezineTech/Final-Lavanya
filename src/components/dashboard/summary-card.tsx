import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type SummaryCardProps = {
  title: string;
  amount: string;
  icon: LucideIcon;
  color: string;
  breakdown?: {
    cash: string;
    card: string;
    credit: string;
  };
};

export function SummaryCard({ title, amount, icon: Icon, color, breakdown }: SummaryCardProps) {
  return (
    <Card className="text-white" style={{ backgroundColor: color }}>
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div>
            <div className="flex justify-center mb-2">
                <Icon className="h-8 w-8 opacity-90" />
            </div>
            <p className="text-center text-sm font-medium">{title}</p>
            <p className="text-center text-3xl font-bold my-1">${amount}</p>
        </div>
        {breakdown && (
          <div className="text-xs flex justify-between items-center mt-2 border-t border-white/30 pt-2 px-1">
            <span>Cash: ${breakdown.cash}</span>
            <span>Card: ${breakdown.card}</span>
            <span>Credit: ${breakdown.credit}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
