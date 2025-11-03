// app/dashboard/invoice/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import InvoiceForm from "@/components/InvoiceForm";
import {
  FileText,
  Download,
  Trash2,
  Eye,
  Search,
  RefreshCw,
  DollarSign,
  Package,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { POListSkeleton } from "@/components/skeleton/POListSkeleton";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  date: string;
  total: string;
  subtotal: string;
  tax: string;
  status: string;
  originalInvoiceUrl: string | null;
  items: any[];
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
  createdAt: string;
}

export default function InvoiceDashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const limit = 20;

  useEffect(() => setMounted(true), []);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["invoices", page, search, statusFilter, refreshTrigger],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: limit.toString(),
      });

      if (search) params.append("search", search);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/invoice?${params}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const isFiltering = isFetching && data !== undefined;

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(0);
  };

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/invoice/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete invoice");

      toast({
        title: "Invoice deleted",
        description: `Invoice ${invoiceNumber} has been deleted.`,
      });

      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete invoice. Please try again.",
      });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/invoice/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast({
        title: "Status updated",
        description: `Invoice status changed to ${status}.`,
      });

      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status. Please try again.",
      });
    }
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please sign in to access invoices</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading invoices...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Failed to load invoices</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error.message}
          </p>
          <Button onClick={() => refetch()} className="cursor-pointer">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalPages = data?.pagination?.totalPages || 0;
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;
  const totalInvoices = data?.pagination?.total || 0;
  const paidCount =
    data?.invoices?.filter((inv: Invoice) => inv.status === "PAID").length || 0;
  const totalAmount =
    data?.invoices?.reduce(
      (sum: number, inv: Invoice) => sum + parseFloat(inv.total),
      0
    ) || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Invoices
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Create and manage invoices with barcode generation
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  refetch();
                  setRefreshTrigger((prev) => prev + 1);
                }}
                disabled={mounted ? isLoading : false}
                className="cursor-pointer transition"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    mounted && (isLoading || isFetching) ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-gray-200 transition"
              >
                <Plus className="w-4 h-4" />
                {showForm ? "Hide Form" : "Create Invoice"}
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-2xl font-bold">{totalInvoices}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Invoices
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-2xl font-bold">
                      ${mounted ? totalAmount.toFixed(2) : totalAmount}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Amount
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-2xl font-bold">{paidCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Paid Invoices
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Invoice Form */}
        {showForm && (
          <div className="animate-in slide-in-from-top duration-300">
            <InvoiceForm
              userId={session.user.id}
              onSuccess={(invoice) => {
                console.log("Invoice created:", invoice);
                setRefreshTrigger((prev) => prev + 1);
                refetch();
                setShowForm(false);
                toast({
                  title: "Success!",
                  description: `Invoice ${invoice.invoiceNumber} created successfully`,
                });
              }}
            />
          </div>
        )}

        {/* Divider */}
        {showForm && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-gray-500 font-medium">
                All Invoices
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by invoice #, customer, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10 dark:border-zinc-700"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Invoice List */}
        {isFiltering ? (
          <POListSkeleton />
        ) : (
          //   <div className="space-y-4">
          //     {[1, 2, 3, 4, 5].map((i) => (
          //       <Card key={i} className="animate-pulse">
          //         <CardContent className="p-6">
          //           <div className="flex items-center justify-between">
          //             <div className="flex-1">
          //               <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
          //                 <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          //                 <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
          //                 <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          //                 <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          //               </div>
          //             </div>
          //             <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded ml-4" />
          //           </div>
          //         </CardContent>
          //       </Card>
          //     ))}
          //   </div>
          <div className="space-y-4">
            {data?.invoices && data.invoices.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No invoices found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {search
                      ? "No invoices match your search"
                      : "Create your first invoice to get started"}
                  </p>
                  {!showForm && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="cursor-pointer"
                      variant={"outline"}
                    >
                      Create Invoice
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {data?.invoices?.map((invoice: Invoice) => {
              const statusColors = {
                DRAFT:
                  "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
                PENDING:
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                CANCELLED:
                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              };

              return (
                <Card
                  key={invoice.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
                          {/* Invoice Number */}
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {invoice.invoiceNumber}
                            </h3>
                          </div>

                          {/* Status */}
                          <select
                            value={invoice.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(invoice.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
                              statusColors[
                                invoice.status as keyof typeof statusColors
                              ]
                            }`}
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>

                          {/* Customer */}
                          {/* <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span className="font-medium">
                              {invoice.customerName}
                            </span>
                          </div> */}

                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {mounted
                                ? new Date(invoice.date).toLocaleDateString()
                                : invoice.date}
                            </span>
                          </div>

                          {/* Total */}
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${invoice.total}
                          </div>

                          {/* Items Count */}
                          <Badge variant="outline" className="text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            {invoice.items.length} item
                            {invoice.items.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/invoice/${invoice.id}`);
                          }}
                          className="cursor-pointer"
                          title="View Details"
                        >
                          {/* <Eye className="w-4 h-4" /> */}
                          View Invoice
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `/api/invoice/${invoice.id}/pdf`,
                              "_blank"
                            );
                          }}
                          className="cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(invoice.id, invoice.invoiceNumber);
                          }}
                          className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && !isFiltering && (
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              Showing page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={!hasPrevPage || isFiltering}
                className="cursor-pointer"
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum =
                    page <= 2
                      ? i
                      : page >= totalPages - 3
                      ? totalPages - 5 + i
                      : page - 2 + i;

                  if (pageNum < 0 || pageNum >= totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-10 cursor-pointer"
                      disabled={isFiltering}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages - 1, prev + 1))
                }
                disabled={!hasNextPage || isFiltering}
                className="cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
