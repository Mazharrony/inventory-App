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
import { Package, Users, Shield, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import bcrypt from "bcryptjs";

interface User {
  Login_id: number;
  username: string;
  password_hash?: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

const Settings = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState({
    username: '',
    fullName: '',
    role: '',
    password: ''
  });
  const [newUser, setNewUser] = useState({
    fullName: '',
    role: '',
    username: '',
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

    // Prevent creating multiple admins
    if (newUser.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount >= 1) {
        toast({
          title: "Error",
          description: "Only one admin user is allowed",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const hashedPassword = await bcrypt.hash(newUser.password, 10);

      const { data, error } = await (supabase as any)
        .from('profiles')
        .insert([
          {
            username: newUser.username,
            password_hash: hashedPassword,
            full_name: newUser.fullName,
            role: newUser.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

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
        updateData.password_hash = await bcrypt.hash(editUser.password, 10);
      }

      const { error } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('Login_id', editingUser?.Login_id?.toString() || '0');

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

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      fullName: user.full_name || '',
      role: user.role || 'admin',
      password: ''
    });
    setIsEditDialogOpen(true);
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

  // Fetch users
  const fetchUsers = async () => {
    try {
      console.log('Fetching users from profiles table...');
      const { data, error } = await (supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })) as { data: any; error: any };

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
      setUsers((data as unknown as User[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
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
            <Package className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators can access the settings page.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Your role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader
        title="JNK GENERAL TRADING LLC"
        subtitle="System Administration & User Management"
        icon={<Package className="w-6 h-6 text-primary-foreground" />}
      />
      <main className="container max-w-6xl mx-auto p-6 space-y-6">

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users ({users.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchUsers}>
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
              {users.map((user) => (
                <div
                  key={user.Login_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{user.full_name || user.username}</h3>
                      <p className="text-sm text-muted-foreground">
                        Username: {user.username} | Created: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Active</Badge>
                    <Badge variant="outline">
                      {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}
                    </Badge>
                    <div className="flex gap-1">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
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
                              <Label htmlFor="edit-role">Role</Label>
                              <Select value={editUser.role} onValueChange={(value) => setEditUser({...editUser, role: value})}>
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
                              <Label htmlFor="edit-username">Username</Label>
                              <Input
                                id="edit-username"
                                value={editUser.username}
                                onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-password">New Password (Optional)</Label>
                              <Input
                                id="edit-password"
                                type="password"
                                placeholder="Leave blank to keep current"
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
                        onClick={() => deleteUser(user.Login_id)}
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

export default Settings;