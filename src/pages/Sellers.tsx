/*
╔══════════════════════════════════════════════════════════════════╗
║  JNK GENERAL TRADING LLC - Sales & Inventory Management System      ║
║                                                                  ║
║  Crafted with Excellence by: MAZHAR RONY                     ║
║  "Building tomorrow's business solutions today"               ║
║                                                                  ║
║  Connect: hello@meetmazhar.site | Portfolio: www.meetmazhar.site  ║
╚══════════════════════════════════════════════════════════════════╝
*/

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  Plus,
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  Users,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Mail
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { format } from "date-fns";

interface PendingInvitation {
  id: string;
  email: string;
  role: "admin" | "seller";
  invitation_token: string;
  created_at: string;
  expires_at: string;
  is_used: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "seller";
  is_active: boolean;
  created_at: string;
}

const Sellers = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "seller">("seller");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchPendingInvitations();
    }
  }, [isAdmin]);

  const fetchPendingInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('is_used', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending invitations:', error);
        return;
      }

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const createInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      // Check if invitation already exists for this email
      const { data: existingInvitation } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', inviteEmail.toLowerCase())
        .eq('is_used', false)
        .single();

      if (existingInvitation) {
        toast({
          title: "Error",
          description: "An active invitation already exists for this email",
          variant: "destructive",
        });
        setIsInviting(false);
        return;
      }

      // Create invitation
      const invitationToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const { data, error } = await supabase
        .from('user_invitations')
        .insert({
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          invitation_token: invitationToken,
          expires_at: expiresAt,
          invited_by: user?.email,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating invitation:', error);
        toast({
          title: "Error",
          description: "Failed to create invitation",
          variant: "destructive",
        });
        setIsInviting(false);
        return;
      }

      // Try to send email via Edge Function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: inviteEmail.toLowerCase(),
            role: inviteRole,
            invitationToken: invitationToken,
            invitedBy: user?.email,
          },
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
          toast({
            title: "Warning",
            description: "Invitation created but email failed to send. Use 'Copy Link' to share manually.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Invitation sent to ${inviteEmail}`,
          });
        }
      } catch (emailError) {
        console.error('Email function error:', emailError);
        toast({
          title: "Warning",
          description: "Invitation created but email failed to send. Use 'Copy Link' to share manually.",
          variant: "destructive",
        });
      }

      setInviteEmail("");
      setInviteRole("seller");
      setInviteDialog(false);
      fetchPendingInvitations();

    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const copyInvitationLink = async (invitation: PendingInvitation) => {
    const baseUrl = window.location.origin;
    const invitationUrl = `${baseUrl}/invite/${invitation.invitation_token}`;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast({
        title: "Copied",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to cancel invitation",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Invitation cancelled",
      });

      fetchPendingInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  };

  const deleteUser = async (userToDelete: UserProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `User ${userToDelete.email} deleted`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-background">
        <AppHeader
          title="User Management"
          subtitle="Invite new users and manage existing accounts"
          icon={<Users className="w-6 h-6 text-primary-foreground" />}
        />

        <div className="container mx-auto p-6 space-y-6">
          <Tabs defaultValue="invitations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invitations">
                <Mail className="w-4 h-4 mr-2" />
                Invitations ({pendingInvitations.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                Active Users ({users.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invitations" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Pending Invitations</h2>
                  <p className="text-muted-foreground">Manage outstanding user invitations</p>
                </div>

                <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Invitation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="user@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={isInviting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="inviteRole">Role</Label>
                        <select
                          id="inviteRole"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as "admin" | "seller")}
                          className="w-full p-2 border rounded-md"
                          disabled={isInviting}
                        >
                          <option value="seller">Seller</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setInviteDialog(false)}
                        disabled={isInviting}
                      >
                        Cancel
                      </Button>
                      <Button onClick={createInvitation} disabled={isInviting}>
                        {isInviting ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {pendingInvitations.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No pending invitations</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-semibold">{invitation.email}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge>{invitation.role}</Badge>
                              <Badge variant="outline">
                                Expires: {format(new Date(invitation.expires_at), "MMM dd, yyyy")}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyInvitationLink(invitation)}
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelInvitation(invitation.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Active Users</h2>
                  <p className="text-muted-foreground">Manage existing user accounts</p>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {isLoadingUsers ? (
                    <p className="text-center py-8">Loading users...</p>
                  ) : users.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No users found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || 'N/A'}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.is_active ? 'default' : 'outline'}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(user.created_at), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteUser(user)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Sellers;
