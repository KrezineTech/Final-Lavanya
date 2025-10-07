
"use client";

import Link from "next/link";
import Image from "next/image";
import { UniversalSearch } from '@/components/ui/universal-search';
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Settings,
  Bell,
  Users,
  BarChart3,
  LifeBuoy,
  FileText,
  Newspaper,
  Film,
  Star,
  TrendingUp,
  TrendingDown,
  List,
  MessageSquare,
  Database,
  Monitor,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const DiscountIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
      version="1.1"
      id="fi_879859"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      viewBox="0 0 512.003 512.003"
      xmlSpace="preserve"
      {...props}
      fill="currentColor"
    >
      <g>
        <g>
          <path
            d="M477.958,262.633c-2.06-4.215-2.06-9.049,0-13.263l19.096-39.065c10.632-21.751,2.208-47.676-19.178-59.023l-38.41-20.38
			c-4.144-2.198-6.985-6.11-7.796-10.729l-7.512-42.829c-4.183-23.846-26.241-39.87-50.208-36.479l-43.053,6.09
			c-4.647,0.656-9.242-0.838-12.613-4.099l-31.251-30.232c-17.401-16.834-44.661-16.835-62.061,0L193.72,42.859
			c-3.372,3.262-7.967,4.753-12.613,4.099l-43.053-6.09c-23.975-3.393-46.025,12.633-50.208,36.479l-7.512,42.827
			c-0.811,4.62-3.652,8.531-7.795,10.73l-38.41,20.38c-21.386,11.346-29.81,37.273-19.178,59.024l19.095,39.064
			c2.06,4.215,2.06,9.049,0,13.263l-19.096,39.064c-10.632,21.751-2.208,47.676,19.178,59.023l38.41,20.38
			c4.144,2.198,6.985,6.11,7.796,10.729l7.512,42.829c3.808,21.708,22.422,36.932,43.815,36.93c2.107,0,4.245-0.148,6.394-0.452
			l43.053-6.09c4.643-0.659,9.241,0.838,12.613,4.099l31.251,30.232c8.702,8.418,19.864,12.626,31.03,12.625
			c11.163-0.001,22.332-4.209,31.03-12.625l31.252-30.232c3.372-3.261,7.968-4.751,12.613-4.099l43.053,6.09
			c23.978,3.392,46.025-12.633,50.208-36.479l7.513-42.827c0.811-4.62,3.652-8.531,7.795-10.73l38.41-20.38
			c21.386-11.346,29.81-37.273,19.178-59.024L477.958,262.633z M196.941,123.116c29.852,0,54.139,24.287,54.139,54.139
			s-24.287,54.139-54.139,54.139s-54.139-24.287-54.139-54.139S167.089,123.116,196.941,123.116z M168.997,363.886
			c-2.883,2.883-6.662,4.325-10.44,4.325s-7.558-1.441-10.44-4.325c-5.766-5.766-5.766-15.115,0-20.881l194.889-194.889
			c5.765-5.766,15.115-5.766,20.881,0c5.766,5.766,5.766,15.115,0,20.881L168.997,363.886z M315.061,388.888
			c-29.852,0-54.139-24.287-54.139-54.139s24.287-54.139,54.139-54.139c29.852,0,54.139,24.287,54.139,54.139
			S344.913,388.888,315.061,388.888z"
          />
        </g>
      </g>
      <g>
        <g>
          <path
            d="M315.061,310.141c-13.569,0-24.609,11.039-24.609,24.608s11.039,24.608,24.609,24.608
			c13.569,0,24.608-11.039,24.608-24.608S328.63,310.141,315.061,310.141z"
          />
        </g>
      </g>
      <g>
        <g>
          <path
            d="M196.941,152.646c-13.569,0-24.608,11.039-24.608,24.608c0,13.569,11.039,24.609,24.608,24.609
			c13.569,0,24.609-11.039,24.609-24.609C221.549,163.686,210.51,152.646,196.941,152.646z"
          />
        </g>
      </g>
    </svg>
);

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/orders", label: "Orders & Shipping", icon: ShoppingCart },
  { href: "/products", label: "Category & Collections", icon: Package },
  { href: "/listings", label: "Listings", icon: List },
  { href: "/message", label: "Messages", icon: MessageSquare },
  { href: "/discounts", label: "Discounts", icon: DiscountIcon },
  { href: "/content", label: "Content", icon: Film },
  { href: "/dynamic-pages", label: "Dynamic Pages", icon: Monitor },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/blogs", label: "Blogs", icon: Newspaper },
  { href: "/pages", label: "Pages", icon: FileText },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

const initialNotifications = [
    { icon: ShoppingCart, title: "New Order", description: "#ORD1234 has been placed.", read: false },
    { icon: Users, title: "New Customer", description: "John Doe signed up.", read: false },
    { icon: Package, title: "Stock Alert", description: "Wireless Headphones low on stock.", read: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [searchQuery, setSearchQuery] = useState("");
  const [year, setYear] = useState<number | null>(null);
  
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const filteredNavItems = navItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="https://krezine.in/wp-content/uploads/2025/06/krezine-black-logo.svg"
              alt="Krezine Logo"
              width={150}
              height={48}
              className="dark:hidden"
              priority
            />
            <Image
              src="https://krezine.in/wp-content/uploads/2025/01/KREZINE-05.svg"
              alt="Krezine Logo"
              width={150}
              height={48}
              className="hidden dark:block"
              priority
            />
          </Link>
        </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarMenu>
          {filteredNavItems.map((item) => {
            const isActive = pathname
              ? (item.href === "/" ? pathname === item.href : pathname.startsWith(item.href))
              : false;
            return (
              <SidebarMenuItem key={item.href} className="px-4">
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    size="lg"
                    className="justify-start gap-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                  >
                    <Link href={item.href}>
                      <item.icon className={isActive ? "text-primary" : "text-muted-foreground"}/>
                      <span className="text-foreground font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 text-xs text-muted-foreground text-center space-y-1">
        <Separator className="mb-2" />
        <div>
          Built by{' '}
          <a
            href="https://krezine.in"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            Krezine
          </a>
        </div>
        <div>© {year} All rights reserved.          </div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset>
      <header className="flex h-20 items-center justify-between gap-4 border-b bg-background px-4 lg:px-6 sticky top-0 z-30">
          {/* Sidebar Trigger for mobile */}
        <SidebarTrigger className="md:hidden" />
        
        <div className="hidden md:block">
         
        </div>

        <div className="flex flex-1 justify-end items-center gap-2 md:gap-4">
          <UniversalSearch
            placeholder="Search products, orders, customers..."
            className="w-full max-w-xs sm:max-w-sm"
            searchEndpoint="/api/admin/search"
            isAdmin={true}
            variant="compact"
          />
          
          <Sheet>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 relative">
                          <Bell className="h-5 w-5 text-muted-foreground" />
                          <span className="sr-only">Toggle notifications</span>
                          {notifications.some(n => !n.read) && (
                              <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                          )}
                      </Button>
                      </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
              <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                      <div className="flex justify-between items-center">
                          <SheetTitle>Notifications</SheetTitle>
                          {notifications.length > 0 && (
                              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setNotifications([])}>Clear All</Button>
                          )}
                      </div>
                  </SheetHeader>
                  <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                          {notifications.length > 0 ? (
                              notifications.map((notification, index) => (
                                  <div key={index} className="flex items-start gap-4">
                                      <div className="bg-muted p-2 rounded-full mt-1">
                                          <notification.icon className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                      <div className="flex-1">
                                          <p className="font-semibold text-sm">{notification.title}</p>
                                          <p className="text-xs text-muted-foreground">{notification.description}</p>
                                      </div>
                                      {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                                  </div>
                              ))
                          ) : (
                              <div className="text-center text-muted-foreground py-10 h-full flex flex-col justify-center items-center">
                                  <Bell className="mx-auto h-8 w-8 mb-2" />
                                  <p className="font-semibold">No new notifications</p>
                                  <p className="text-sm">You're all caught up!</p>
                              </div>
                          )}
                      </div>
                  </ScrollArea>
              </SheetContent>
          </Sheet>

          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <div className="flex-1 p-4 sm:p-6">
          {children}
        </div>
      </main>
    </SidebarInset>
  </SidebarProvider>
  );
}
