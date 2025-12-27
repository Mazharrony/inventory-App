import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Mail, 
  Key, 
  Camera, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Calendar,
  UserCheck,
  Clock,
  Save
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppHeader } from "@/components/AppHeader";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

// Local avatar options from public/avatars folder
const avatarOptions = [
  "/avatars/avatar_1.svg",
  "/avatars/avatar_2.svg",
  "/avatars/avatar_3.svg",
  "/avatars/avatar_4.svg",
  "/avatars/avatar_5.svg",
  "/avatars/avatar_6.svg",
  "/avatars/avatar_7.svg",
  "/avatars/avatar_8.svg"
];

// Default demo avatar
const DEFAULT_AVATAR = "/avatars/avatar_1.svg";

const Profile = () => {
  const { user, userRole, isAdmin } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const { toast } = useToast();

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (newPassword.length >= 12) strength++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength++;
    if (/\d/.test(newPassword)) strength++;
    if (/[^a-zA-Z\d]/.test(newPassword)) strength++;
    
    if (strength <= 2) return { strength, label: 'Weak', color: 'text-destructive' };
    if (strength <= 3) return { strength, label: 'Medium', color: 'text-yellow-600 dark:text-yellow-500' };
    return { strength, label: 'Strong', color: 'text-success' };
  }, [newPassword]);

  const fetchProfile = async (preserveLocalAvatar = false) => {
    if (!user) return;

    setIsProfileLoading(true);
    try {
      console.log('Fetching profile for user:', user);
      
      // Store current avatar if we want to preserve it
      const currentLocalAvatar = preserveLocalAvatar ? avatarUrl : null;
      
      // Use admin_users table (the one that actually exists)
      const { data, error } = await (supabase as any)
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const profileData = data as UserProfile;
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        // Only update avatar from database if we're not preserving local state
        if (!preserveLocalAvatar) {
          // Use demo avatar if no avatar is set
          setAvatarUrl(profileData.avatar_url || DEFAULT_AVATAR);
        } else {
          // Keep the local avatar that was just selected
          console.log('Preserving local avatar:', currentLocalAvatar);
        }
        console.log('Profile loaded:', profileData);
      } else {
        // Create basic profile from user data
        const basicProfile = {
          id: user.id,
          full_name: user.fullName || user.username,
          avatar_url: DEFAULT_AVATAR,
          updated_at: new Date().toISOString()
        };
        setProfile(basicProfile);
        setFullName(basicProfile.full_name || "");
        if (!preserveLocalAvatar) {
          setAvatarUrl(DEFAULT_AVATAR);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  const updateProfile = async () => {
    await updateProfileWithAvatar(avatarUrl);
  };

  const updateProfileWithAvatar = async (selectedAvatarUrl?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "No user found. Please sign in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {

      const currentAvatarUrl = selectedAvatarUrl || avatarUrl;

      const updates = {
        id: user.id,
        full_name: fullName.trim() || null,
        avatar_url: currentAvatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      console.log('Updating profile with:', updates);
      console.log('Current avatarUrl state:', avatarUrl);
      console.log('Selected avatar URL:', selectedAvatarUrl);
      
      // Use admin_users table
      let { data, error } = await (supabase as any)
        .from('admin_users')
        .update({
          full_name: fullName.trim() || null,
          avatar_url: currentAvatarUrl.trim() || null
        })
        .eq('id', user.id)
        .select();

      // If avatar_url column doesn't exist, try without it
      if (error && error.message?.includes('avatar_url')) {
        console.log('avatar_url column does not exist, updating without it...');
        const fallbackUpdate = await (supabase as any)
          .from('admin_users')
          .update({
            full_name: fullName.trim() || null
          })
          .eq('id', user.id)
          .select();
        
        data = fallbackUpdate.data;
        error = fallbackUpdate.error;
        
        // Show error about avatar limitation
        if (!fallbackUpdate.error) {
          // Update the local state to show the avatar visually even though it's not saved
          if (currentAvatarUrl) {
            setAvatarUrl(currentAvatarUrl);
          }
          toast({
            title: "Database Column Missing",
            description: "Avatar displays locally but won't persist. Add avatar_url column to admin_users table to save permanently.",
            variant: "destructive",
          });
          // Don't refresh profile data since it would reset the avatar
          return;
        }
      }

      if (error) {
        console.error('Supabase error:', error);
        
        // If the table doesn't exist, show a helpful message
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          toast({
            title: "Database Setup Required",
            description: "Profile update failed. Please contact your administrator.",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Error",
          description: `Failed to update profile: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Profile updated successfully:', data);
      
      // Check if avatar was actually updated
      if (data && data[0] && currentAvatarUrl && data[0].avatar_url !== currentAvatarUrl) {
        console.warn('Avatar was not saved:', { expected: currentAvatarUrl, actual: data[0].avatar_url });
        toast({
          title: "Partial Success",
          description: "Name updated successfully, but avatar failed to save.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }

      // If we just updated an avatar, preserve it during profile refresh
      const shouldPreserveAvatar = currentAvatarUrl && currentAvatarUrl !== (data?.[0]?.avatar_url || '');
      fetchProfile(shouldPreserveAvatar);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectAvatar = (avatar: string) => {
    console.log('Selecting avatar:', avatar);
    setAvatarUrl(avatar);
    setShowAvatarDialog(false);
    
    // Show immediate feedback
    toast({
      title: "Avatar Selected",
      description: `Selected ${avatar}. Saving to profile...`,
    });
    
    // Immediately save the avatar with the selected URL
    setTimeout(() => {
      updateProfileWithAvatar(avatar);
    }, 100);
  };

  const updatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      // Update password in admin_users table
      const { error } = await (supabase as any)
        .from('admin_users')
        .update({
          password_hash: newPassword
        })
        .eq('id', user.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to update password",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!user) return;
    
    try {
      toast({
        title: "Verification Email",
        description: "Verification functionality is not implemented in this system.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send verification email",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Set default avatar immediately if no avatar is set
    if (!avatarUrl) {
      setAvatarUrl(DEFAULT_AVATAR);
    }
    fetchProfile();
    // Auto-attempt to add avatar column if missing
    attemptAddAvatarColumn();
  }, [user]);

  const attemptAddAvatarColumn = async () => {
    if (!user) return;
    
    try {
      // Test if avatar_url column exists
      const { data, error } = await supabase
        .from('admin_users')
        .select('avatar_url')
        .limit(1);

      if (error && error.message.includes('column "avatar_url" does not exist')) {
        console.log('Attempting to auto-add avatar_url column...');
        
        // Try to add the column via RPC
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
            sql: 'ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;'
          });
          
          if (!rpcError) {
            console.log('Avatar column added successfully!');
            toast({
              title: "Database Updated",
              description: "Avatar column added successfully! Avatar functionality is now enabled.",
            });
            // Refresh the profile to pick up the new column
            setTimeout(() => fetchProfile(), 1000);
            return;
          }
        } catch (rpcError) {
          console.log('RPC method failed:', rpcError);
        }
        
        // If RPC fails, show manual instructions
        console.log('Auto-add failed. Manual setup required.');
      } else if (!error) {
        console.log('Avatar column already exists');
      }
    } catch (error) {
      console.log('Column check failed:', error);
    }
  };

  if (!user) return null;

  const getInitials = (name: string | null) => {
    if (!name) return user.username?.charAt(0).toUpperCase() || "U";
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div>
      <AppHeader
        title="User Profile"
        subtitle="Manage your account settings and preferences"
        icon={<User className="w-6 h-6 text-primary-foreground" />}
      />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-5xl">
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Profile Overview */}
          <Card className="lg:col-span-1 border-border/60 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardHeader className="text-center pb-4">
              {isProfileLoading ? (
                <div className="flex flex-col items-center space-y-4">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Avatar className="w-28 h-28 border-4 border-primary/20 shadow-xl relative z-10">
                      <AvatarImage src={avatarUrl || DEFAULT_AVATAR} alt={fullName || user.username || ""} />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold">
                        {getInitials(fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="absolute -bottom-1 -right-1 rounded-full w-10 h-10 p-0 shadow-lg bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary border-2 border-background"
                          onClick={() => setShowAvatarDialog(true)}
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                              <Camera className="w-4 h-4 text-primary-foreground" />
                            </div>
                            Choose Your Avatar
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 p-4">
                          {avatarOptions.map((avatar, index) => (
                            <button
                              key={index}
                              onClick={() => selectAvatar(avatar)}
                              className={cn(
                                "relative rounded-xl p-3 transition-all duration-200 hover:scale-105 hover:shadow-lg group",
                                avatarUrl === avatar 
                                  ? 'ring-2 ring-primary bg-primary/10 shadow-md' 
                                  : 'hover:bg-accent'
                              )}
                            >
                              <Avatar className="w-16 h-16 mx-auto">
                                <AvatarImage src={avatar} alt={`Avatar option ${index + 1}`} />
                                <AvatarFallback>A{index + 1}</AvatarFallback>
                              </Avatar>
                              {avatarUrl === avatar && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {fullName || "Set your name"}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">@{user.username}</p>
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                      <Badge 
                        variant={isAdmin ? 'default' : 'secondary'}
                        className={cn(
                          "font-semibold px-2.5 py-1",
                          isAdmin && "bg-primary/10 text-primary border-primary/30"
                        )}
                      >
                        {isAdmin && <Shield className="w-3 h-3 mr-1" />}
                        {userRole || 'User'}
                      </Badge>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-semibold">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isProfileLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="font-semibold">Full Name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-semibold">Username</Label>
                        <Input
                          id="email"
                          value={user.username || ""}
                          disabled
                          className="bg-muted/50 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avatar" className="font-semibold">Avatar</Label>
                      <div className="flex items-center gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowAvatarDialog(true)}
                          className="gap-2 h-11 hover-lift"
                        >
                          <Camera className="w-4 h-4" />
                          Choose Avatar
                        </Button>
                        {avatarUrl && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-success" />
                            Avatar selected
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose from {avatarOptions.length} preset avatars
                      </p>
                    </div>
                    <Button 
                      onClick={updateProfile} 
                      disabled={isLoading}
                      className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md w-full sm:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <Save className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <Key className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="font-semibold">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      minLength={6}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-9 w-9"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-semibold">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-9 w-9"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <KeyRound className={cn("w-3 h-3", passwordStrength.color)} />
                        <span className={cn("font-medium", passwordStrength.color)}>
                          Password strength: {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            passwordStrength.strength <= 2 && "bg-destructive",
                            passwordStrength.strength === 3 && "bg-yellow-500",
                            passwordStrength.strength >= 4 && "bg-success"
                          )}
                          style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-semibold">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      minLength={6}
                      className={cn(
                        "h-11 pr-10",
                        confirmPassword && newPassword !== confirmPassword && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-9 w-9"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {confirmPassword && newPassword && (
                    <div className="flex items-center gap-2 text-xs">
                      {newPassword === confirmPassword ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-success" />
                          <span className="text-success font-medium">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-destructive" />
                          <span className="text-destructive font-medium">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={updatePassword} 
                  disabled={passwordLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md w-full sm:w-auto"
                >
                  {passwordLoading ? (
                    <>
                      <Key className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isProfileLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent rounded-lg border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Account Created</Label>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : 'User Profile'}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-500/5 to-transparent rounded-lg border border-blue-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Last Updated</Label>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {profile ? new Date(profile.updated_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : "Never"}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success/5 to-transparent rounded-lg border border-success/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Account Role</Label>
                      </div>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "font-semibold",
                          isAdmin && "bg-primary/10 text-primary border-primary/30"
                        )}
                      >
                        {userRole || "User"}
                      </Badge>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success/5 to-transparent rounded-lg border border-success/10">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Account Status</Label>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-semibold">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;