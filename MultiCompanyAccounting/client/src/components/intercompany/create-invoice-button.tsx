import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateInvoiceButtonProps {
  sourceOrderId: number;
  targetOrderId: number;
  onSuccess?: () => void;
}

export function CreateInvoiceButton({ 
  sourceOrderId, 
  targetOrderId,
  onSuccess 
}: CreateInvoiceButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateInvoice = async () => {
    try {
      setIsLoading(true);
      
      // Call the auto-invoicing API to create invoice and receipt for the transaction
      const response = await apiRequest('POST', '/api/auto-invoicing/process-from-orders', {
        sourceOrderId,
        targetOrderId
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success!",
          description: "Invoice and receipt created successfully",
        });
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create invoice and receipt",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateInvoice} 
      disabled={isLoading || !sourceOrderId || !targetOrderId}
      variant="default"
      className="mt-4"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Invoice...
        </>
      ) : (
        "Create Invoice & Receipt"
      )}
    </Button>
  );
}

export default CreateInvoiceButton;