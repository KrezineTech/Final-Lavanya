"use client"

import { Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const monthlyData = [
  { name: "Jul", sales: 50 },
  { name: "Aug", sales: 60 },
  { name: "Sep", sales: 70 },
  { name: "Oct", sales: 40 },
  { name: "Nov", sales: 150 },
  { name: "Dec", sales: 350 },
];

const weeklyData = [
  { name: "Mon", sales: 20 },
  { name: "Tue", sales: 35 },
  { name: "Wed", sales: 25 },
  { name: "Thu", sales: 40 },
  { name: "Fri", sales: 50 },
  { name: "Sat", sales: 60 },
  { name: "Sun", sales: 55 },
];

const yearlyData = [
  { name: "2019", sales: 1200 },
  { name: "2020", sales: 1800 },
  { name: "2021", sales: 1500 },
  { name: "2022", sales: 2200 },
  { name: "2023", sales: 2500 },
  { name: "2024", sales: 3200 },
];


export function SalesGraphCard() {
  const chartHeight = "h-[300px]";
  const renderChart = (data: any[]) => (
    <ChartContainer config={{}} className={`${chartHeight} w-full`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent indicator="dot" />} />
            <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );

  return (
    <Tabs defaultValue="monthly">
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sale Graph</CardTitle>
            <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
        </CardHeader>
        <CardContent>
            <TabsContent value="monthly">{renderChart(monthlyData)}</TabsContent>
            <TabsContent value="weekly">{renderChart(weeklyData)}</TabsContent>
            <TabsContent value="yearly">{renderChart(yearlyData)}</TabsContent>
        </CardContent>
        </Card>
    </Tabs>
  )
}
