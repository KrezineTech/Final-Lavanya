
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const bestSellers = [
  { name: 'Acoustic Guitar', price: 299.99, sales: 999, image: 'https://placehold.co/100x100.png', hint: 'acoustic guitar' },
  { name: 'Wireless Headphones', price: 149.00, sales: 852, image: 'https://placehold.co/100x100.png', hint: 'wireless headphones' },
  { name: 'Ergonomic Chair', price: 350.00, sales: 764, image: 'https://placehold.co/100x100.png', hint: 'office chair' },
];

export function BestSellersCard() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Best Sellers</CardTitle>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem>View All</DropdownMenuItem>
                <DropdownMenuItem>Export</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-6">
          {bestSellers.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <Image
                src={item.image}
                alt={item.name}
                width={56}
                height={56}
                className="rounded-lg object-cover aspect-square"
                data-ai-hint={item.hint}
              />
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.sales} sales</p>
              </div>
              <p className="font-semibold">${item.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
