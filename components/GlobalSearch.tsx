"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Package, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  link: string;
  meta: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchProducts = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchProducts();
  }, [debouncedQuery]);

  const handleSelect = (link: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="w-4 h-4 text-blue-600" />;
      case "order":
        return <ShoppingCart className="w-4 h-4 text-green-600" />;
      default:
        return <Search className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="relative w-48 md:w-64" ref={wrapperRef}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        placeholder="Search products, orders, SKUs..."
        className="pl-10"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
      />

      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <div
              key={result.id}
              onClick={() => handleSelect(result.link)}
              className="flex items-start gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
            >
              <div className="mt-1">{getIcon(result.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{result.title}</div>
                <div className="text-xs text-muted-foreground">
                  {result.subtitle}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{result.meta}</div>
            </div>
          ))}
        </div>
      )}

      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
