// Owner directory page

import React, { useState } from "react";
import { useOwners, useCreateOwner } from "@/hooks/use-owners";
import { useAuth } from "@/hooks/use-auth"; // This import was missing
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOwnerSchema } from "@shared/schema";
import { z } from "zod";
import { Search, Plus, ContactRound, Phone, Mail, MapPin } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function OwnersList() {
  const { user } = useAuth(); // Now this will work
  const { data: owners, isLoading } = useOwners();
  const { mutate: createOwner, isPending } = useCreateOwner();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof insertOwnerSchema>>({
    resolver: zodResolver(insertOwnerSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      phone: "",
      address: "",
      additionalInfo: "",
    }
  });

  const filteredOwners = owners?.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  function onSubmit(values: z.infer<typeof insertOwnerSchema>) {
    createOwner(values, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
      }
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Owner Directory</h1>
          <p className="text-muted-foreground mt-1">Manage project owners and owner representatives for your contracts.</p>
        </div>

        {user?.role === 'contract_manager' && ( // Added optional chaining
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate shadow-md bg-primary hover:bg-primary/90 rounded-full px-6">
                <Plus className="w-4 h-4 mr-2" />
                Add Owner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Add New Owner</DialogTitle>
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
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Owner"}</Button>
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
          placeholder="Search owners..." 
          className="pl-9 bg-card border-border shadow-sm rounded-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filteredOwners?.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-xl border border-border">
          <ContactRound className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold">No owners found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwners?.map(owner => (
            <Card key={owner.id} className="hover-elevate glass-panel overflow-hidden border-border/50">
              <div className="h-2 w-full bg-gradient-to-r from-primary to-accent opacity-80" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xl font-display">
                    {owner.name.charAt(0)}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs">Edit</Button>
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-4">{owner.name}</h3>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-primary/70" />
                    <span className="truncate">{owner.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-primary/70" />
                    <span>{owner.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-primary/70" />
                    <span className="truncate">{owner.address || 'No address provided'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}