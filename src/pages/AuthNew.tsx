
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  // Pre-fill credentials for convenience
  React.useEffect(() => {
    if (!username && !password) {
      setUsername("admin");
      setPassword("admin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      
      // Simple authentication with local users
      const users = [
        { username: 'admin', password: 'admin', role: 'admin', fullName: 'Admin User' },
        { username: 'demo', password: 'demo', role: 'admin', fullName: 'Demo User' },
        { username: 'seller', password: 'seller', role: 'seller', fullName: 'Seller User' },
      ];
      
      const foundUser = users.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase() && 
             u.password === password.trim()
      );
      
      if (foundUser) {
        const userData = {
          id: `${foundUser.username}-${Date.now()}`,
          username: foundUser.username,
          role: foundUser.role as 'admin' | 'seller' | 'accountant',
          fullName: foundUser.fullName
        };
        
        setUser(userData);
        
        toast({
          title: "Welcome!",
          description: `Signed in as ${foundUser.fullName}`,
        });
        
        navigate('/');
        return;
      } else {
        showMessage("Invalid credentials. Try: admin/admin, demo/demo, or seller/seller", 'error');
        return;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showMessage("An error occurred during sign in. Please try again.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse" />
            <div className="absolute inset-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-xl">
              <Package className="w-8 h-8 text-primary-foreground drop-shadow-sm" />
            </div>
          </div>
          <h2 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-primary-foreground drop-shadow-sm" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">JNK GENERAL TRADING LLC</h1>
              <p className="text-sm text-muted-foreground font-medium">Sales Management System</p>
            </div>
          </div>
          <Badge variant="outline" className="px-3 py-1 font-semibold border-primary/30 bg-primary/5">
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
        <Card className="shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto shadow-lg">
              <Lock className="w-8 h-8 text-primary-foreground drop-shadow-sm" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Admin Sign In</CardTitle>
            <p className="text-muted-foreground font-medium">Enter your credentials to access the system</p>
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

            {/* Quick Login Buttons */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center">Quick Login Options:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUsername("admin");
                    setPassword("admin");
                  }}
                  className="text-xs"
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUsername("demo");
                    setPassword("demo");
                  }}
                  className="text-xs"
                >
                  Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUsername("seller");
                    setPassword("seller");
                  }}
                  className="text-xs"
                >
                  Seller
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground font-medium">
          <p>© {new Date().getFullYear()} JNK GENERAL TRADING LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthNew;