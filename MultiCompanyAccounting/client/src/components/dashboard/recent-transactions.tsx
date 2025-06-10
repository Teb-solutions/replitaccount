import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: number;
  date: string;
  description: string;
  type: string;
  amount: number;
  status?: string;
}

interface RecentTransactionsProps {
  transactions?: Transaction[];
}

export default function RecentTransactions({ transactions = [] }: RecentTransactionsProps) {
  // Define badge colors based on transaction type
  const getTypeColor = (type: string) => {
    if (!type) return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      icon: 'ri-file-list-3-line'
    };
    
    switch (type.toLowerCase()) {
      case 'invoice':
        return {
          bg: 'bg-primary-50',
          text: 'text-primary-700',
          icon: 'ri-file-list-3-line'
        };
      case 'bill':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          icon: 'ri-file-paper-2-line'
        };
      case 'payment':
      case 'inflow':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          icon: 'ri-bank-card-line'
        };
      case 'outflow':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          icon: 'ri-bank-card-line'
        };
      case 'expense':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: 'ri-money-dollar-circle-line'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: 'ri-file-list-3-line'
        };
    }
  };

  // Define badge colors based on status
  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'pending':
        return 'bg-amber-50 text-amber-700';
      case 'overdue':
        return 'bg-red-50 text-red-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</TableHead>
            <TableHead className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</TableHead>
            <TableHead className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</TableHead>
            <TableHead className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Amount</TableHead>
            <TableHead className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => {
              const typeStyle = getTypeColor(transaction.type);
              const statusColor = getStatusColor(transaction.status);
              
              return (
                <TableRow key={transaction.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-3.5 text-sm text-gray-900">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-sm text-gray-900">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                      <i className={`${typeStyle.icon} mr-1`}></i> {transaction.type}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-sm text-gray-900 text-right">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-sm text-right">
                    <Badge variant="outline" className={`${statusColor}`}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
