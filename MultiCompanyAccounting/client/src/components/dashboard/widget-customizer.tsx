import { useState } from 'react';
import { DraggableCore, DraggableEventHandler } from 'react-draggable';
import { 
  Card,
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { 
  Cog,
  GripVertical, 
  LayoutGrid, 
  RefreshCw, 
  Save
} from 'lucide-react';
import { useDashboardPreferences, DashboardWidget } from '@/hooks/use-dashboard-preferences';
import { useToast } from '@/hooks/use-toast';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  onToggle: (id: string) => void;
  dragHandleProps?: any;
}

function DraggableWidget({ widget, onToggle, dragHandleProps }: DraggableWidgetProps) {
  return (
    <div className="flex items-center justify-between bg-white p-3 rounded-md border mb-2">
      <div className="flex items-center">
        <div {...dragHandleProps} className="cursor-grab mr-2 text-gray-400 hover:text-gray-600">
          <GripVertical size={16} />
        </div>
        <span className="font-medium">{widget.name}</span>
        <span className="ml-2 text-xs text-gray-500 capitalize">{widget.type}</span>
        {widget.size !== 'large' && (
          <span className="ml-1 text-xs text-gray-500">• {widget.size}</span>
        )}
      </div>
      <Switch
        checked={widget.enabled}
        onCheckedChange={() => onToggle(widget.id)}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}

export default function WidgetCustomizer() {
  const { 
    widgets, 
    layout, 
    toggleWidget, 
    reorderWidgets, 
    resetToDefaults, 
    savePreferences 
  } = useDashboardPreferences();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<'leftColumn' | 'rightColumn' | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Sort widgets based on layout order
  const leftColumnWidgets = layout.leftColumn
    .map(id => widgets.find(w => w.id === id))
    .filter(Boolean) as DashboardWidget[];
    
  const rightColumnWidgets = layout.rightColumn
    .map(id => widgets.find(w => w.id === id))
    .filter(Boolean) as DashboardWidget[];
    
  // All available widgets (ones not in layout)
  const availableWidgets = widgets.filter(
    w => !layout.leftColumn.includes(w.id) && !layout.rightColumn.includes(w.id)
  );

  const handleDragStart: DraggableEventHandler = (e, data) => {
    setIsDragging(true);
    const widgetId = data.node.getAttribute('data-widget-id');
    const column = data.node.getAttribute('data-column') as 'leftColumn' | 'rightColumn';
    if (widgetId) {
      setDraggedWidget(widgetId);
      setDraggedColumn(column);
    }
  };

  const handleDragStop: DraggableEventHandler = (e, data) => {
    setIsDragging(false);
    
    // Logic to handle reordering
    if (draggedWidget && draggedColumn) {
      const targetColumn = document.elementFromPoint(
        data.x,
        data.y
      )?.closest('[data-column]')?.getAttribute('data-column') as 'leftColumn' | 'rightColumn';

      if (targetColumn) {
        // Reorder the widgets in the target column
        const reordered = [...(targetColumn === 'leftColumn' ? layout.leftColumn : layout.rightColumn)];
        const draggedIndex = reordered.indexOf(draggedWidget);
        
        if (draggedIndex > -1) {
          // Get the nearest drop target
          const dropTarget = document.elementFromPoint(data.x, data.y)?.closest('[data-widget-id]');
          if (dropTarget) {
            const targetId = dropTarget.getAttribute('data-widget-id');
            const targetIndex = reordered.indexOf(targetId!);
            
            if (targetIndex > -1 && targetIndex !== draggedIndex) {
              // Remove from old position
              reordered.splice(draggedIndex, 1);
              // Insert at new position
              reordered.splice(targetIndex, 0, draggedWidget);
              
              // Update layout
              reorderWidgets(reordered, targetColumn);
            }
          }
        }
      }
    }
    
    setDraggedWidget(null);
    setDraggedColumn(null);
  };

  const handleSave = async () => {
    try {
      await savePreferences();
      toast({
        title: "Dashboard layout saved",
        description: "Your dashboard preferences have been saved successfully",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "There was an error saving your dashboard preferences",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    resetToDefaults();
    toast({
      title: "Dashboard reset",
      description: "Dashboard layout has been reset to default",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <LayoutGrid size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Customize Dashboard</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Left Column (Main)</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-column="leftColumn" className="min-h-[200px]">
                {leftColumnWidgets.map((widget) => (
                  <DraggableCore
                    key={widget.id}
                    onStart={handleDragStart}
                    onStop={handleDragStop}
                  >
                    <div data-widget-id={widget.id} data-column="leftColumn">
                      <DraggableWidget
                        widget={widget}
                        onToggle={toggleWidget}
                        dragHandleProps={{ className: 'cursor-grab' }}
                      />
                    </div>
                  </DraggableCore>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Right Column (Sidebar)</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-column="rightColumn" className="min-h-[200px]">
                {rightColumnWidgets.map((widget) => (
                  <DraggableCore
                    key={widget.id}
                    onStart={handleDragStart}
                    onStop={handleDragStop}
                  >
                    <div data-widget-id={widget.id} data-column="rightColumn">
                      <DraggableWidget
                        widget={widget}
                        onToggle={toggleWidget}
                        dragHandleProps={{ className: 'cursor-grab' }}
                      />
                    </div>
                  </DraggableCore>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Widgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {availableWidgets.map((widget) => (
                <DraggableWidget
                  key={widget.id}
                  widget={widget}
                  onToggle={toggleWidget}
                />
              ))}
              {availableWidgets.length === 0 && (
                <p className="text-sm text-gray-500">No additional widgets available</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex items-center"
          >
            <RefreshCw size={14} className="mr-1" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} className="flex items-center">
              <Save size={14} className="mr-1" />
              Save Layout
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}