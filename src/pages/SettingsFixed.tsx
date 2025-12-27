import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { supabase } from "@/integrations/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Users, Shield, Plus, Edit, Trash2, RefreshCw, Search, Filter, UserCheck, UserX, Calendar, KeyRound, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: number;
  username: string;
  password_hash?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

const SettingsFixed = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  const [newUser, setNewUser] = useState({
    fullName: '',
    role: '',
    username: '',
    password: ''
  });
  const [editUser, setEditUser] = useState({
    username: '',
    fullName: '',
    role: '',
    password: ''
  });

  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Create new user
  const createUser = async () => {
    if (!newUser.fullName || !newUser.role || !newUser.username || !newUser.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating user:', newUser);
      
      // Try admin_users table first
      let { data, error } = await (supabase as any)
        .from('admin_users')
        .insert({
          username: newUser.username,
          password_hash: newUser.password,
          full_name: newUser.fullName,
          role: newUser.role,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select();

      // If admin_users doesn't work, try profiles table
      if (error) {
        console.log('admin_users failed, trying profiles table:', error);
        const profileData = await (supabase as any)
          .from('profiles')
          .insert({
            username: newUser.username,
            password: newUser.password,
            full_name: newUser.fullName,
            role: newUser.role,
            created_at: new Date().toISOString()
          })
          .select();
        
        data = profileData.data;
        error = profileData.error;
      }

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('User created successfully:', data);
      toast({
        title: "Success",
        description: `User ${newUser.fullName} created successfully`,
      });

      // Reset form
      setNewUser({
        fullName: '',
        role: '',
        username: '',
        password: ''
      });
      setIsCreateDialogOpen(false);
      
      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  // Update existing user
  const updateUser = async () => {
    if (!editUser.username || !editUser.fullName || !editUser.role) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: any = {
        username: editUser.username,
        full_name: editUser.fullName,
        role: editUser.role,
        updated_at: new Date().toISOString()
      };

      // Only update password if provided
      if (editUser.password.trim()) {
        updateData.password_hash = editUser.password;
      }

      const { error } = await (supabase as any)
        .from('admin_users')
        .update(updateData)
        .eq('id', editingUser?.id?.toString() || '0');

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `User ${editUser.fullName} updated successfully`,
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      
      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  // Delete user
  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const { error } = await (supabase as any)
        .from('admin_users')
        .delete()
        .eq('id', userToDelete.id.toString());

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `User ${userToDelete.full_name || userToDelete.username} deleted successfully` 
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message 
      });
    }
  };

  // Open delete confirmation
  const openDeleteDialog = (user: AdminUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      fullName: user.full_name || '',
      role: user.role || 'admin',
      password: ''
    });
    setIsEditDialogOpen(true);
  };

  // Fetch admin users
  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      
      // Try admin_users table first
      let { data, error } = await (supabase as any)
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      // If admin_users doesn't exist, try profiles
      if (error && error.code === 'PGRST106') {
        console.log('admin_users table not found, trying profiles...');
        const profileData = await (supabase as any)
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        data = profileData.data;
        error = profileData.error;
      }

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched users:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-destructive/20 rounded-2xl animate-pulse" />
            <div className="absolute inset-2 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text text-transparent">Access Denied</h1>
            <p className="text-muted-foreground font-medium">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader 
        title="JNK GENERAL TRADING LLC"
        subtitle="User Management & Settings"
        icon={<Shield className="w-6 h-6 text-primary-foreground" />}
      />
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
        {/* Current Session */}
        <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Logged in as: <span className="text-primary">{user?.username}</span></p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Role: Administrator
                </p>
              </div>
              <Badge variant="default" className="px-3 py-1 font-semibold">Admin</Badge>
            </div>
          </CardContent>
        </Card>

      {/* Admin Users List */}
      <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-foreground" />
              </div>
              User Management
              <Badge variant="secondary" className="ml-2">{users.length} {users.length === 1 ? 'User' : 'Users'}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchUsers} className="hover-lift">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary-foreground" />
                      </div>
                      Create New User
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-name" className="font-semibold">Full Name *</Label>
                      <Input 
                        id="new-name" 
                        placeholder="Enter full name" 
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-role" className="font-semibold">Role *</Label>
                      <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-username" className="font-semibold">Login ID *</Label>
                      <Input 
                        id="new-username" 
                        placeholder="Enter login ID" 
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="font-semibold">Password *</Label>
                      <div className="relative">
                        <Input 
                          id="new-password" 
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password" 
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          className="h-11 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-9 w-9"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {newUser.password && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <KeyRound className="w-3 h-3" />
                          Password strength: {newUser.password.length >= 8 ? 'Strong' : newUser.password.length >= 5 ? 'Medium' : 'Weak'}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                      <Button onClick={createUser} className="bg-gradient-to-r from-primary to-primary/90">Create User</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-11">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <UserX className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {searchTerm || roleFilter !== 'all' ? 'No users found' : 'No users yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || roleFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Get started by creating your first user'}
                </p>
              </div>
              {(!searchTerm && roleFilter === 'all') && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First User
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((adminUser) => (
                <div
                  key={adminUser.id}
                  className="group flex items-center justify-between p-4 border border-border/60 rounded-lg bg-card/50 hover:bg-card hover:shadow-md transition-all duration-200 hover:border-primary/20"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {adminUser.full_name || adminUser.username}
                        </h3>
                        {adminUser.is_active !== false && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {adminUser.username}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(adminUser.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "font-semibold",
                        adminUser.role === 'admin' && "bg-primary/10 text-primary border-primary/30",
                        adminUser.role === 'accountant' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                        adminUser.role === 'seller' && "bg-success/10 text-success border-success/30"
                      )}
                    >
                      {adminUser.role ? adminUser.role.charAt(0).toUpperCase() + adminUser.role.slice(1) : 'Admin'}
                    </Badge>
                    <div className="flex gap-1">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditDialog(adminUser)}
                            className="hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                                <Edit className="w-4 h-4 text-primary-foreground" />
                              </div>
                              Edit User
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label htmlFor="edit-fullname" className="font-semibold">Full Name *</Label>
                              <Input 
                                id="edit-fullname" 
                                value={editUser.fullName}
                                onChange={(e) => setEditUser({...editUser, fullName: e.target.value})}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-username" className="font-semibold">Username *</Label>
                              <Input 
                                id="edit-username" 
                                value={editUser.username}
                                onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-role" className="font-semibold">Role *</Label>
                              <Select value={editUser.role} onValueChange={(value) => setEditUser({...editUser, role: value})}>
                                <SelectTrigger className="h-11">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="accountant">Accountant</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-password" className="font-semibold">Password</Label>
                              <div className="relative">
                                <Input 
                                  id="edit-password" 
                                  type={showEditPassword ? "text" : "password"}
                                  placeholder="Leave blank to keep current password" 
                                  value={editUser.password}
                                  onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                                  className="h-11 pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1 h-9 w-9"
                                  onClick={() => setShowEditPassword(!showEditPassword)}
                                >
                                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">Leave blank to keep current password</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                              <Button onClick={updateUser} className="bg-gradient-to-r from-primary to-primary/90">Update User</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                        onClick={() => openDeleteDialog(adminUser)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete <strong>{userToDelete?.full_name || userToDelete?.username}</strong>? 
              This action cannot be undone and will permanently remove the user from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* System Info */}
      <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent rounded-lg border border-primary/10">
              <p className="font-semibold text-sm text-muted-foreground mb-1">Authentication</p>
              <p className="text-lg font-bold text-foreground">Simple Admin-Only</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500/5 to-transparent rounded-lg border border-blue-500/10">
              <p className="font-semibold text-sm text-muted-foreground mb-1">Database</p>
              <p className="text-lg font-bold text-foreground">Supabase PostgreSQL</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-success/5 to-transparent rounded-lg border border-success/10">
              <p className="font-semibold text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="text-lg font-bold text-foreground">{users.length} {users.length === 1 ? 'User' : 'Users'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </main>
    </>
  );
};

export default SettingsFixed;