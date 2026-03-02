import { Activity, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

const CreateStatusPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">StatusWatch</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Status Pages
        </Link>

        <h2 className="text-xl font-semibold text-foreground">Create Status Page</h2>

        <div className="border border-dashed border-border rounded-lg p-8 text-center space-y-3">
          <p className="text-muted-foreground">New status page creation flow coming soon.</p>
        </div>
      </main>
    </div>
  );
};

export default CreateStatusPage;
