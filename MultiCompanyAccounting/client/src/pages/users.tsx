import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertUserSchema, User } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Edit, Loader2, LockKeyhole, PlusCircle, UserCog } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type UserFormData = {
  name: string;
  email: string;
  password?: string;
  role: string;
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { data: users, isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!currentUser && currentUser.role === "admin",
  });
  
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: errorsCreate },
    reset: resetCreate,
  } = useForm<UserFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      role: "user",
    },
  });
  
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit },
    reset: resetEdit,
  } = useForm<Omit<UserFormData, "password">>({
    resolver: zodResolver(insertUserSchema.omit({ password: true })),
  });
  
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: errorsReset },
    reset: resetResetForm,
  } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(
      insertUserSchema
        .pick({ password: true })
        .extend({
          confirmPassword: insertUserSchema.shape.password,
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        })
    ),
  });
  
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateModalOpen(false);
      resetCreate();
      toast({
        title: "User created",
        description: "The user was created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Omit<UserFormData, "password"> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditModalOpen(false);
      setEditingUser(null);
      toast({
        title: "User updated",
        description: "The user was updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await apiRequest("POST", `/api/users/${id}/reset-password`, { password });
      return res.json();
    },
    onSuccess: () => {
      setIsResetModalOpen(false);
      setEditingUser(null);
      resetResetForm();
      toast({
        title: "Password reset",
        description: "The password was reset successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to reset password: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onCreateSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };
  
  const onEditSubmit = (data: Omit<UserFormData, "password">) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    }
  };
  
  const onResetSubmit = (data: { password: string; confirmPassword: string }) => {
    if (editingUser) {
      resetPasswordMutation.mutate({ id: editingUser.id, password: data.password });
    }
  };
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    resetEdit({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setIsEditModalOpen(true);
  };
  
  const handleResetPassword = (user: User) => {
    setEditingUser(user);
    resetResetForm();
    setIsResetModalOpen(true);
  };
  
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Access Denied</h3>
          <p className="text-gray-500 text-center mt-2 max-w-md">
            You don't have permission to view this page. Admin access is required.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (isUsersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Users & Roles</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-10">
              <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">No Users Found</h3>
              <p className="text-gray-500 mt-2">
                No additional users have been added yet.
              </p>
              <Button className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add First User
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditUser(user)}
                          title="Edit User"
                          disabled={currentUser.id === user.id}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleResetPassword(user)}
                          title="Reset Password"
                          disabled={currentUser.id === user.id}
                        >
                          <LockKeyhole className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate(onCreateSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    {...registerCreate("name")}
                    placeholder="John Doe"
                    className={errorsCreate.name ? "border-red-500" : ""}
                  />
                  {errorsCreate.name && (
                    <p className="text-red-500 text-xs mt-1">{errorsCreate.name.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="email"
                    type="email"
                    {...registerCreate("email")}
                    placeholder="john@example.com"
                    className={errorsCreate.email ? "border-red-500" : ""}
                  />
                  {errorsCreate.email && (
                    <p className="text-red-500 text-xs mt-1">{errorsCreate.email.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="password"
                    type="password"
                    {...registerCreate("password")}
                    className={errorsCreate.password ? "border-red-500" : ""}
                  />
                  {errorsCreate.password && (
                    <p className="text-red-500 text-xs mt-1">{errorsCreate.password.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role*
                </Label>
                <div className="col-span-3">
                  <Select defaultValue="user" {...registerCreate("role")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                    </SelectContent>
                  </Select>
                  {errorsCreate.role && (
                    <p className="text-red-500 text-xs mt-1">{errorsCreate.role.message}</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(onEditSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-name"
                    {...registerEdit("name")}
                    className={errorsEdit.name ? "border-red-500" : ""}
                  />
                  {errorsEdit.name && (
                    <p className="text-red-500 text-xs mt-1">{errorsEdit.name.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-email"
                    type="email"
                    {...registerEdit("email")}
                    className={errorsEdit.email ? "border-red-500" : ""}
                  />
                  {errorsEdit.email && (
                    <p className="text-red-500 text-xs mt-1">{errorsEdit.email.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Role*
                </Label>
                <div className="col-span-3">
                  <Select defaultValue={editingUser?.role} {...registerEdit("role")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                    </SelectContent>
                  </Select>
                  {errorsEdit.role && (
                    <p className="text-red-500 text-xs mt-1">{errorsEdit.role.message}</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Reset Password Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitReset(onResetSubmit)}>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-gray-500">
                Set a new password for user: <strong>{editingUser?.name}</strong>
              </p>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reset-password" className="text-right">
                  New Password*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="reset-password"
                    type="password"
                    {...registerReset("password")}
                    className={errorsReset.password ? "border-red-500" : ""}
                  />
                  {errorsReset.password && (
                    <p className="text-red-500 text-xs mt-1">{errorsReset.password.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reset-confirm-password" className="text-right">
                  Confirm Password*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    {...registerReset("confirmPassword")}
                    className={errorsReset.confirmPassword ? "border-red-500" : ""}
                  />
                  {errorsReset.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errorsReset.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
