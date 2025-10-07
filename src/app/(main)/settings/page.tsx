
'use client';

import React, { useState } from 'react';
import { PlusCircle, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ShippingZone, Package } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { connectProvider, manageProvider } from "@/services/paymentService";

// Data from original pages
const initialShippingZones: ShippingZone[] = [
    { id: '1', name: "United States", countries: "United States" },
    { id: '2', name: "Canada", countries: "Canada" },
    { id: '3', name: "Europe", countries: "European Union, United Kingdom" },
    { id: '4', name: "India", countries: "India" },
];

const initialPackages: Package[] = [
    { id: 'pkg1', name: "Small Box", dimensions: "8 x 6 x 4 in", weight: "up to 5 lbs" },
    { id: 'pkg2', name: "Medium Box", dimensions: "12 x 10 x 6 in", weight: "up to 15 lbs" },
];

const availableCurrencies = [
    { code: "USD", name: "United States Dollar" },
    { code: "INR", name: "Indian Rupee" },
    { code: "EUR", name: "Euro" },
];

type Provider = 'stripe' | 'paypal' | 'razorpay';
const providers = [
    { id: 'stripe' as Provider, name: 'Stripe', description: 'Accept credit cards, debit cards, and other popular payment methods from around the world.' },
    { id: 'paypal' as Provider, name: 'PayPal', description: 'Enable customers to pay with their PayPal account.' },
    { id: 'razorpay' as Provider, name: 'Razorpay', description: 'Accept payments in India with support for UPI, net banking, and more.' }
];

export default function SettingsPage() {
  const { toast } = useToast();

  // State from shipping page
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>(initialShippingZones);
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [zoneToDelete, setZoneToDelete] = useState<ShippingZone | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  // State from payments page
  const [primaryCurrency, setPrimaryCurrency] = useState("USD");
  const [supportedStatus, setSupportedStatus] = useState<{[key: string]: boolean}>({ USD: true, INR: true, EUR: false });
  const [providerConnections, setProviderConnections] = useState({ stripe: true, paypal: false, razorpay: false });
  const [isConnecting, setIsConnecting] = useState<Provider | null>(null);


  // Handlers from shipping page
  const resetZoneDialog = () => { setEditingZone(null); setIsZoneDialogOpen(false); };
  const resetPackageDialog = () => { setEditingPackage(null); setIsPackageDialogOpen(false); };
  const handleEditZoneClick = (zone: ShippingZone) => { setEditingZone(zone); setIsZoneDialogOpen(true); };
  const handleEditPackageClick = (pkg: Package) => { setEditingPackage(pkg); setIsPackageDialogOpen(true); };
  const handleDeleteZone = () => { if (zoneToDelete) { setShippingZones(shippingZones.filter(z => z.id !== zoneToDelete.id)); setZoneToDelete(null); } };
  const handleDeletePackage = () => { if (packageToDelete) { setPackages(packages.filter(p => p.id !== packageToDelete.id)); setPackageToDelete(null); } };
  const handleSaveZone = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const zoneData = { name: formData.get('name') as string, countries: formData.get('countries') as string };
      if (editingZone) {
          setShippingZones(shippingZones.map(z => z.id === editingZone.id ? { ...editingZone, ...zoneData } : z));
      } else {
          setShippingZones([{ id: `zone-${Date.now()}`, ...zoneData }, ...shippingZones]);
      }
      resetZoneDialog();
  };
  const handleSavePackage = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const packageData = { name: formData.get('name') as string, dimensions: formData.get('dimensions') as string, weight: formData.get('weight') as string };
      if (editingPackage) {
          setPackages(packages.map(p => p.id === editingPackage.id ? { ...editingPackage, ...packageData } : p));
      } else {
          setPackages([{ id: `pkg-${Date.now()}`, ...packageData }, ...packages]);
      }
      resetPackageDialog();
  };
  
  // Handlers from payments page
  const handlePrimaryCurrencyChange = (newPrimary: string) => {
      setPrimaryCurrency(newPrimary);
      setSupportedStatus(prev => ({ ...prev, [newPrimary]: true }));
  };
  const handleSupportedChange = (code: string, checked: boolean) => {
      setSupportedStatus(prev => ({ ...prev, [code]: checked }));
  };
  const handleManageProvider = async (provider: string) => {
    await manageProvider(provider);
    toast({ title: `Managing ${provider}`, description: `Opening settings for ${provider}...` });
  };
  const handleConnectProvider = async (provider: Provider) => {
    setIsConnecting(provider);
    try {
      const result = await connectProvider(provider);
      if (result.success) {
        setProviderConnections(prev => ({ ...prev, [provider]: true }));
        toast({ title: `Connected to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`, description: `You can now accept payments via ${provider}.` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: `Connection Failed`, description: error.message || "An unknown error occurred." });
    } finally {
      setIsConnecting(null);
    }
  };


  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your store's public details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Label htmlFor="storeName">Store Name</Label><Input id="storeName" defaultValue="Krezine" /></div>
              <div className="space-y-1"><Label htmlFor="storeEmail">Contact Email</Label><Input id="storeEmail" defaultValue="contact@krezine.com" /></div>
            </CardContent>
            <CardFooter><Button>Save Changes</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notification Preferences</CardTitle><CardDescription>Customize how you receive alerts.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <Label htmlFor="new-order-email" className="flex flex-col space-y-1"><span>New Order Emails</span><span className="font-normal leading-snug text-muted-foreground">Receive an email for every new order.</span></Label>
                <Switch id="new-order-email" defaultChecked />
              </div>
               <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <Label htmlFor="low-stock-email" className="flex flex-col space-y-1"><span>Low Stock Alerts</span><span className="font-normal leading-snug text-muted-foreground">Get notified when products are low on stock.</span></Label>
                <Switch id="low-stock-email" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
           <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Shipping Zones</CardTitle>
                        <CardDescription>Manage where you ship and how much it costs.</CardDescription>
                    </div>
                    <Button onClick={() => setIsZoneDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Zone</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Zone Name</TableHead>
                                <TableHead>Countries</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shippingZones.map(zone => (
                                <TableRow key={zone.id}>
                                    <TableCell className="font-medium">{zone.name}</TableCell>
                                    <TableCell>{zone.countries}</TableCell>
                                    <TableCell className="text-right">
                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditZoneClick(zone)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit Zone</TooltipContent></Tooltip>
                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setZoneToDelete(zone)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TooltipTrigger><TooltipContent>Delete Zone</TooltipContent></Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Packages</CardTitle>
                        <CardDescription>Manage your predefined package sizes.</CardDescription>
                    </div>
                    <Button onClick={() => setIsPackageDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Package</Button>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Package Name</TableHead>
                                <TableHead>Dimensions</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {packages.map(pkg => (
                                <TableRow key={pkg.id}>
                                    <TableCell className="font-medium">{pkg.name}</TableCell>
                                    <TableCell>{pkg.dimensions}</TableCell>
                                    <TableCell>{pkg.weight}</TableCell>
                                    <TableCell className="text-right">
                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditPackageClick(pkg)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit Package</TooltipContent></Tooltip>
                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setPackageToDelete(pkg)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TooltipTrigger><TooltipContent>Delete Package</TooltipContent></Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Payment Providers</CardTitle><CardDescription>Connect with payment providers to accept payments.</CardDescription></CardHeader>
            <CardContent>
              {providers.map((provider, index) => (
                <React.Fragment key={provider.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                    {providerConnections[provider.id] ? (
                      <Button variant="outline" onClick={() => handleManageProvider(provider.name)}>Manage</Button>
                    ) : (
                      <Button onClick={() => handleConnectProvider(provider.id)} disabled={isConnecting === provider.id}>
                        {isConnecting === provider.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect
                      </Button>
                    )}
                  </div>
                  {index < providers.length - 1 && <Separator className="my-4" />}
                </React.Fragment>
              ))}
            </CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle>Currencies</CardTitle><CardDescription>Manage the currencies you accept in your store.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Currency</Label>
                  <Select value={primaryCurrency} onValueChange={handlePrimaryCurrencyChange}>
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue placeholder="Select primary currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">This is the main currency for your store's pricing.</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Supported Currencies</Label>
                  <p className="text-xs text-muted-foreground">Allow customers to see prices in their local currency.</p>
                   <div className="space-y-2 pt-2">
                      {availableCurrencies.map(c => (
                        <div key={c.code} className="flex items-center justify-between rounded-lg border p-3">
                            <Label htmlFor={`currency-${c.code}`} className="font-normal">{c.name} ({c.code})</Label>
                            <Switch id={`currency-${c.code}`} checked={supportedStatus[c.code] || false} onCheckedChange={(checked) => handleSupportedChange(c.code, checked)} disabled={c.code === primaryCurrency} />
                        </div>
                      ))}
                   </div>
                </div>
            </CardContent>
            <CardFooter><Button>Save Currency Settings</Button></CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for Shipping Zones */}
      <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>{editingZone ? "Edit Shipping Zone" : "Add Shipping Zone"}</DialogTitle><DialogDescription>Define a zone and the countries within it.</DialogDescription></DialogHeader>
              <form id="zoneForm" onSubmit={handleSaveZone}>
                  <div className="py-4 space-y-4">
                      <div className="space-y-2"><Label htmlFor="name">Zone Name</Label><Input id="name" name="name" defaultValue={editingZone?.name} placeholder="e.g., North America" required /></div>
                      <div className="space-y-2"><Label htmlFor="countries">Countries</Label><Textarea id="countries" name="countries" defaultValue={editingZone?.countries} placeholder="e.g., United States, Canada, Mexico" required /></div>
                  </div>
              </form>
              <DialogFooter><Button variant="outline" onClick={resetZoneDialog}>Cancel</Button><Button type="submit" form="zoneForm">Save Zone</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog for Packages */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>{editingPackage ? "Edit Package" : "Add Package"}</DialogTitle><DialogDescription>Define a reusable package size.</DialogDescription></DialogHeader>
              <form id="packageForm" onSubmit={handleSavePackage}>
                  <div className="py-4 space-y-4">
                      <div className="space-y-2"><Label htmlFor="pkg-name">Package Name</Label><Input id="pkg-name" name="name" defaultValue={editingPackage?.name} placeholder="e.g., Small Padded Envelope" required /></div>
                      <div className="space-y-2"><Label htmlFor="dimensions">Dimensions (L x W x H)</Label><Input id="dimensions" name="dimensions" defaultValue={editingPackage?.dimensions} placeholder="e.g., 8 x 6 x 4 in" required /></div>
                      <div className="space-y-2"><Label htmlFor="weight">Weight</Label><Input id="weight" name="weight" defaultValue={editingPackage?.weight} placeholder="e.g., up to 5 lbs" required /></div>
                  </div>
              </form>
              <DialogFooter><Button variant="outline" onClick={resetPackageDialog}>Cancel</Button><Button type="submit" form="packageForm">Save Package</Button></DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Alert Dialogs for Deletion */}
      <AlertDialog open={!!zoneToDelete} onOpenChange={() => setZoneToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{zoneToDelete?.name}" shipping zone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteZone}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!packageToDelete} onOpenChange={() => setPackageToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{packageToDelete?.name}" package.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeletePackage}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
