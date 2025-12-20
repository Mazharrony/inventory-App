

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Settings, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  CheckCircle2,
  Package
} from "lucide-react";

export const DemoMode = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">JNK Nutrition System</h1>
          <Badge variant="outline" className="mb-4">
            <AlertCircle className="w-4 h-4 mr-2" />
            Demo Mode - Supabase Not Configured
          </Badge>
          <p className="text-muted-foreground">
            To use the full application, please configure your Supabase database connection.
          </p>
        </div>

        {/* Configuration Steps */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                1. Setup Supabase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Create a new Supabase project:</p>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to Supabase Dashboard
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Get your project credentials:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Project URL</li>
                  <li>• Anon/Public Key</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                2. Configure Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Create .env file:</p>
                <div className="bg-muted p-3 rounded-md text-sm font-mono">
                  <div className="flex items-center justify-between mb-2">
                    <span>VITE_SUPABASE_URL=your_url</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard('VITE_SUPABASE_URL=your_url')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>VITE_SUPABASE_KEY=your_key</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard('VITE_SUPABASE_KEY=your_key')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Setup */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              3. Database Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Run the database migrations to create the required tables:
            </p>
            
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center justify-between">
                <code className="text-sm">npm run setup:db</code>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => copyToClipboard('npm run setup:db')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 mt-4">
              <div className="flex items-center text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                User authentication & roles
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                Product inventory management
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                Sales tracking & analytics
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                Undo logging system
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>1.</strong> Copy <code>.env.example</code> to <code>.env</code>
              </div>
              <div>
                <strong>2.</strong> Add your Supabase credentials
              </div>
              <div>
                <strong>3.</strong> Run <code>npm run setup:db</code>
              </div>
              <div>
                <strong>4.</strong> Restart the development server
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-primary/10 rounded-md">
              <p className="text-sm">
                <strong>Admin Account:</strong> kamal@jnknutrition.com (auto-created)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};