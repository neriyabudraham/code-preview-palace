
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Check if this is a potential published page request
  const currentPath = window.location.pathname;
  const isRootPath = currentPath === '/';
  const isPotentialPublishedPage = !isRootPath && !currentPath.startsWith('/_');

  // If it might be a published page, redirect immediately without showing anything
  if (isPotentialPublishedPage) {
    const slug = currentPath.substring(1); // Remove leading slash
    window.location.replace(`https://sojhyduhenphvbxvjvpv.supabase.co/functions/v1/serve-page/${slug}`);
    return null; // Don't render anything during redirect
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
