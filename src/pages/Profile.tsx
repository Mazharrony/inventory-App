import { useState, useEffect } from "react";
 import { useAuth } from "@/contexts/SimpleAuthContext";
import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  EyeOff 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppHeader } from "@/components/AppHeader";

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

const Profile = () => {
  const { user, userRole, isAdmin } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async (preserveLocalAvatar = false) => {
    if (!user) return;

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
          setAvatarUrl(profileData.avatar_url || "");
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
          avatar_url: null,
          updated_at: new Date().toISOString()
        };
        setProfile(basicProfile);
        setFullName(basicProfile.full_name || "");
        if (!preserveLocalAvatar) {
          setAvatarUrl("");
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
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
      // First check if Supabase is properly configured
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        toast({
          title: "Configuration Error",
          description: "Supabase is not configured. Running in demo mode.",
          variant: "destructive",
        });
        return;
      }

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

      <div className="container mx-auto p-6 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Profile Overview */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarUrl} alt={fullName || user.username || ""} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 shadow-lg"
                        onClick={() => setShowAvatarDialog(true)}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Choose Your Avatar</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-6 gap-3 p-4">
                        {avatarOptions.map((avatar, index) => (
                          <button
                            key={index}
                            onClick={() => selectAvatar(avatar)}
                            className={`relative rounded-lg p-2 transition-all hover:bg-accent ${
                              avatarUrl === avatar ? 'ring-2 ring-primary bg-accent' : ''
                            }`}
                          >
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={avatar} alt={`Avatar option ${index + 1}`} />
                              <AvatarFallback>A{index + 1}</AvatarFallback>
                            </Avatar>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{fullName || "Set your name"}</h3>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant={isAdmin ? 'destructive' : 'secondary'}>
                      {isAdmin && <Shield className="w-3 h-3 mr-1" />}
                      {userRole || 'User'}
                    </Badge>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active User
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.username || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="avatar">Avatar</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAvatarDialog(true)}
                      className="gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Choose Avatar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose from {avatarOptions.length} preset avatars
                  </p>
                </div>
                <Button onClick={updateProfile} disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={updatePassword} 
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  variant="secondary"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Account Created</Label>
                    <p>User Profile</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Updated</Label>
                    <p>{profile ? new Date(profile.updated_at).toLocaleDateString() : "Never"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Account Role</Label>
                    <p className="font-medium">{userRole || "User"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Account Status</Label>
                    <p className="text-green-600 font-medium">Active User</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;