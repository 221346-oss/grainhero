"use client";

import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SiloVisualizationProps {
  siloId: string | null;
  onClose: () => void;
}

export default function SiloVisualization({ siloId, onClose }: SiloVisualizationProps) {
  if (!siloId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Silo Visualization - {siloId}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Silo visualization details for {siloId}
            </p>
            {/* Add your silo visualization content here */}
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Silo visualization content</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


