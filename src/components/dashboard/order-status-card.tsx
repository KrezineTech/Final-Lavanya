import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type OrderStatusCardProps = {
  title: string;
  count: number;
  icon: LucideIcon;
  iconBgColor: string;
  amount?: string;
};

export function OrderStatusCard({ title, count, icon: Icon, iconBgColor, amount }: OrderStatusCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="rounded-full p-3" style={{ backgroundColor: iconBgColor }}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
            {amount && <span className="text-destructive ml-1">(${amount})</span>}
          </p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </CardContent>
    </Card>
  );
}
