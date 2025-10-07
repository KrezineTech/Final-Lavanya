import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
};

export function StatCard({ title, value, icon: Icon, color, iconBg }: StatCardProps) {
  return (
    <Card className={cn("text-white overflow-hidden", color)}>
      <CardContent className="p-6 flex justify-between items-center relative h-32">
        <div className={cn("absolute -right-6 -top-2 h-24 w-24 rounded-full flex items-center justify-center opacity-50", iconBg)}>
             <Icon className="h-14 w-14 text-white/50" strokeWidth={1}/>
        </div>
        <div className="z-10">
          <p className="text-sm font-light">{title}</p>
          <p className="text-5xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
