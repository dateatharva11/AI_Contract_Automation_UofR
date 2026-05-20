import React, { useState } from "react";
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from "@/hooks/use-vendors";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema } from "@shared/schema";
import { z } from "zod";
import { Search, Plus, Building2, Phone, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

type Vendor = z.infer<typeof insertVendorSchema> & { id: number };

export default function VendorsList() {
  const { user } = useAuth();
  const { data: vendors, isLoading } = useVendors();
  const { mutate: createVendor, isPending: isCreating } = useCreateVendor();
  const { mutate: updateVendor, isPending: isUpdating } = useUpdateVendor();
  const { mutate: deleteVendor, isPending: isDeleting } = useDeleteVendor();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);

  const form = useForm<z.infer<typeof insertVendorSchema>>({
    resolver: zodResolver(insertVendorSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      phone: "",
      address: "",
      additionalInfo: "",
    }
  });

  const filteredVendors = vendors?.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  function handleEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    form.reset({
      name: vendor.name,
      contactEmail: vendor.contactEmail,
      phone: vendor.phone || "",
      address: vendor.address || "",
      additionalInfo: vendor.additionalInfo || "",
    });
    setDialogOpen(true);
  }

  function handleDelete(vendor: Vendor) {
    setDeletingVendor(vendor);
  }

  function confirmDelete() {
    if (deletingVendor) {
      deleteVendor(deletingVendor.id, {
        onSuccess: () => {
          setDeletingVendor(null);
        }
      });
    }
  }

  function onSubmit(values: z.infer<typeof insertVendorSchema>) {
    if (editingVendor) {
      updateVendor({ id: editingVendor.id, data: values }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingVendor(null);
          form.reset();
        }
      });
    } else {
      createVendor(values, {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset();
        }
      });
    }
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setEditingVendor(null);
      form.reset();
    }
    setDialogOpen(open);
  }

  const isPending = isCreating || isUpdating;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Vendor Directory</h1>
          <p className="text-muted-foreground mt-1">Manage approved university contractors and vendors.</p>
        </div>

        {user?.role === 'contract_manager' && (
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="hover-elevate shadow-md bg-primary hover:bg-primary/90 rounded-full px-6">
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="additionalInfo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormControl><Textarea className="rounded-xl min-h-[80px]" {...field} value={field.value || ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (editingVendor ? "Saving..." : "Adding...") : (editingVendor ? "Save Changes" : "Add Vendor")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search vendors..." 
          className="pl-9 bg-card border-border shadow-sm rounded-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filteredVendors?.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-xl border border-border">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold">No vendors found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors?.map(vendor => (
            <Card key={vendor.id} className="hover-elevate glass-panel overflow-hidden border-border/50">
              <div className="h-2 w-full bg-gradient-to-r from-primary to-accent opacity-80" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xl font-display">
                    {vendor.name.charAt(0)}
                  </div>
                  {user?.role === 'contract_manager' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => handleEdit(vendor)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(vendor)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-4">{vendor.name}</h3>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-primary/70" />
                    <span className="truncate">{vendor.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-primary/70" />
                    <span>{vendor.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-primary/70" />
                    <span className="truncate">{vendor.address || 'No address provided'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingVendor} onOpenChange={() => setDeletingVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingVendor?.name}. 
              This action cannot be undone.
              {deletingVendor && (
                <div className="mt-2 text-sm text-destructive">
                  Note: If this vendor is associated with any contracts, deletion will be prevented.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}