import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { supabase } from "@/integrations/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { Package, Users, Shield, Plus, Edit, Trash2, RefreshCw } from "lucide-react";

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
  const deleteUser = async (userId: number) => {
    try {
      const { error } = await (supabase as any)
        .from('admin_users')
        .delete()
        .eq('id', userId.toString());

      if (error) throw error;

      toast({ title: "Success", description: "User deleted successfully" });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">

      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Logged in as: {user?.username}</p>
              <p className="text-sm text-muted-foreground">Role: Administrator</p>
            </div>
            <Badge variant="default">Admin</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Admin Users ({users.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchUsers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-name">Full Name</Label>
                      <Input 
                        id="new-name" 
                        placeholder="Enter full name" 
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-role">Role</Label>
                      <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="new-username">Login ID</Label>
                      <Input 
                        id="new-username" 
                        placeholder="Enter login ID" 
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">Password</Label>
                      <Input 
                        id="new-password" 
                        type="password" 
                        placeholder="Enter password" 
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      />  
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                      <Button onClick={createUser}>Create User</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">Loading admin users...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No admin users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((adminUser) => (
                <div
                  key={adminUser.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{adminUser.full_name || adminUser.username}</h3>
                      <p className="text-sm text-muted-foreground">
                        Username: {adminUser.username} | Created: {new Date(adminUser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Active</Badge>
                    <Badge variant="outline">
                      {adminUser.role ? adminUser.role.charAt(0).toUpperCase() + adminUser.role.slice(1) : 'Admin'}
                    </Badge>
                    <div className="flex gap-1">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(adminUser)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-fullname">Full Name</Label>
                              <Input 
                                id="edit-fullname" 
                                value={editUser.fullName}
                                onChange={(e) => setEditUser({...editUser, fullName: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-username">Username</Label>
                              <Input 
                                id="edit-username" 
                                value={editUser.username}
                                onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-role">Role</Label>
                              <Select value={editUser.role} onValueChange={(value) => setEditUser({...editUser, role: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="accountant">Accountant</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                              <Input 
                                id="edit-password" 
                                type="password" 
                                placeholder="New password" 
                                value={editUser.password}
                                onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                              <Button onClick={updateUser}>Update User</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => deleteUser(adminUser.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Authentication</p>
              <p className="text-muted-foreground">Simple Admin-Only</p>
            </div>
            <div>
              <p className="font-medium">Database</p>
              <p className="text-muted-foreground">Supabase PostgreSQL</p>
            </div>
            <div>
              <p className="font-medium">Total Admin Users</p>
              <p className="text-muted-foreground">{users.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </main>
    </>
  );
};

export default SettingsFixed;