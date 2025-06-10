import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { insertAccountSchema, Account } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  account: Account | null;
  accounts: Account[];
  accountTypes: Array<{ id: number; code: string; name: string; }>;
}

type AccountFormData = {
  accountTypeId: number;
  code: string;
  name: string;
  description?: string;
  parentId?: number | null;
};

export default function AccountModal({
  isOpen,
  onClose,
  onSave,
  account,
  accounts,
  accountTypes,
}: AccountModalProps) {
  const isEditing = !!account;
  
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: {
      accountTypeId: account?.accountTypeId || undefined,
      code: account?.code || "",
      name: account?.name || "",
      description: account?.description || "",
      parentId: account?.parentId || undefined,
    },
  });
  
  // Reset form when account changes
  useEffect(() => {
    if (isOpen) {
      reset({
        accountTypeId: account?.accountTypeId || undefined,
        code: account?.code || "",
        name: account?.name || "",
        description: account?.description || "",
        parentId: account?.parentId || undefined,
      });
    }
  }, [isOpen, account, reset]);
  
  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const response = await apiRequest("POST", "/api/accounts", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "The account was created successfully.",
      });
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create account: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateAccountMutation = useMutation({
    mutationFn: async (data: { id: number; account: AccountFormData }) => {
      const response = await apiRequest("PATCH", `/api/accounts/${data.id}`, data.account);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account updated",
        description: "The account was updated successfully.",
      });
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update account: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: AccountFormData) => {
    if (isEditing && account) {
      updateAccountMutation.mutate({ id: account.id, account: data });
    } else {
      createAccountMutation.mutate(data);
    }
  };
  
  const isPending = createAccountMutation.isPending || updateAccountMutation.isPending;
  
  // Filter accounts by selected account type
  const selectedAccountTypeId = watch("accountTypeId");
  const filteredAccounts = selectedAccountTypeId
    ? accounts.filter((a) => a.accountTypeId === selectedAccountTypeId)
    : [];
    
  // Don't allow an account to be its own parent
  const availableParents = filteredAccounts.filter((a) => !account || a.id !== account.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Account" : "Create New Account"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountType" className="text-right">
              Account Type*
            </Label>
            <div className="col-span-3">
              <Select
                defaultValue={account?.accountTypeId?.toString()}
                onValueChange={(value) => setValue("accountTypeId", parseInt(value))}
                disabled={isEditing}
              >
                <SelectTrigger id="accountType">
                  <SelectValue placeholder="Select Account Type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountTypeId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.accountTypeId.message}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="parentId" className="text-right">
              Parent Account
            </Label>
            <div className="col-span-3">
              <Select
                defaultValue={account?.parentId?.toString()}
                onValueChange={(value) =>
                  setValue("parentId", value ? parseInt(value) : null)
                }
              >
                <SelectTrigger id="parentId">
                  <SelectValue placeholder="No Parent (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent (Top Level)</SelectItem>
                  {availableParents.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              Account Code*
            </Label>
            <div className="col-span-3">
              <Input
                id="code"
                {...register("code")}
                className={errors.code ? "border-red-500" : ""}
              />
              {errors.code && (
                <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Account Name*
            </Label>
            <div className="col-span-3">
              <Input
                id="name"
                {...register("name")}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <div className="col-span-3">
              <Textarea
                id="description"
                {...register("description")}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{isEditing ? "Update" : "Create"} Account</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
