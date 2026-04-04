import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import StudyPage from "./pages/StudyPage";
import QuizPage from "./pages/QuizPage";
import SummaryPage from "./pages/SummaryPage";
import PastPapersPage from "./pages/PastPapersPage";
import GrammarPage from "./pages/GrammarPage";
import CounselingPage from "./pages/CounselingPage";
import ResumePage from "./pages/ResumePage";
import BooksPage from "./pages/BooksPage";
import LibraryPage from "./pages/LibraryPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/past-papers" element={<PastPapersPage />} />
            <Route path="/grammar" element={<GrammarPage />} />
            <Route path="/counseling" element={<CounselingPage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
