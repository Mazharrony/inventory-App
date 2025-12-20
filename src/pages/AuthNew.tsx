
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Lock,
  Eye,
  EyeOff,
  Package,
  AlertCircle,
  User
} from "lucide-react";
import bcrypt from "bcryptjs";

const AuthNew: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'error' | 'info'>('info');
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading, setUser } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const showMessage = (text: string, type: 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleSignIn = async () => {
    if (!username.trim() || !password.trim()) {
      showMessage("Please fill in both username and password", 'error');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login with:', { username: username.trim(), password: password.trim() });
      
      // Try admin_users table first
      let { data, error } = await (supabase as any)
        .from('admin_users')
        .select('*')
        .eq('username', username.trim())
        .eq('password_hash', password.trim())
        .single();

      // If admin_users doesn't work, try profiles table
      if (error && error.code === 'PGRST106') {
        console.log('admin_users table not found, trying profiles...');
        const profileData = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('username', username.trim())
          .eq('password', password.trim())
          .single();
        
        data = profileData.data;
        error = profileData.error;
      }

      console.log('Database response:', { data, error });

      if (error || !data) {
        console.log('Authentication failed:', error);
        showMessage("Invalid username or password", 'error');
        return;
      }

      console.log('Authentication successful:', data);
      
      // Create user data object
      const userData = {
        id: (data.id || data.Login_id).toString(),
        username: data.username,
        role: data.role || 'admin',
        fullName: data.full_name
      };
      
      // Update auth context (this also updates localStorage)
      setUser(userData);
      
      toast({
        title: "Welcome back!",
        description: `Signed in as ${data.full_name || data.username}`,
      });
      
      // Navigate to home
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      showMessage("An error occurred during sign in. Please try again.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-primary-foreground animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-3">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">JNK GENERAL TRADING LLC</h1>
              <p className="text-sm text-muted-foreground">Sales Management System</p>
            </div>
          </div>
          <Badge variant="outline" className="mb-4">
            Admin Access Portal
          </Badge>
        </div>

        {/* Alert Messages */}
        {message && (
          <Alert className={`mb-4 ${messageType === 'error' ? 'border-destructive/20 bg-destructive/10' : 'border-primary/20 bg-primary/10'}`}>
            <AlertCircle className={`h-4 w-4 ${messageType === 'error' ? 'text-destructive' : 'text-primary'}`} />
            <AlertDescription className={`${messageType === 'error' ? 'text-destructive' : 'text-primary'}`}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Auth Form */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Admin Sign In</CardTitle>
            <p className="text-muted-foreground">Enter your credentials to access the system</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleSignIn} 
              disabled={isLoading} 
              className="w-full"
              size="lg"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2025 JNK GENERAL TRADING LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthNew;