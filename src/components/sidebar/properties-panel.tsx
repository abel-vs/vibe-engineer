"use client";

import { useEffect, useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

export function PropertiesPanel() {
  const {
    nodes,
    edges,
    selectedNodeIds,
    selectedEdgeIds,
    updateNode,
    updateEdge,
    removeNode,
    removeEdge,
  } = useDiagramStore();

  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeDescription, setNodeDescription] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");

  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find((n) => n.id === selectedNodeIds[0])
    : null;

  const selectedEdge = selectedEdgeIds.length === 1
    ? edges.find((e) => e.id === selectedEdgeIds[0])
    : null;

  // Sync local state with selected element
  useEffect(() => {
    if (selectedNode) {
      setNodeLabel((selectedNode.data?.label as string) || "");
      setNodeDescription((selectedNode.data?.description as string) || "");
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeLabel((selectedEdge.label as string) || "");
    }
  }, [selectedEdge]);

  const handleNodeLabelChange = (value: string) => {
    setNodeLabel(value);
    if (selectedNode) {
      updateNode(selectedNode.id, {
        data: { ...selectedNode.data, label: value },
      });
    }
  };

  const handleNodeDescriptionChange = (value: string) => {
    setNodeDescription(value);
    if (selectedNode) {
      updateNode(selectedNode.id, {
        data: { ...selectedNode.data, description: value },
      });
    }
  };

  const handleEdgeLabelChange = (value: string) => {
    setEdgeLabel(value);
    if (selectedEdge) {
      updateEdge(selectedEdge.id, { label: value });
    }
  };

  const handleDeleteNode = () => {
    if (selectedNode) {
      removeNode(selectedNode.id);
    }
  };

  const handleDeleteEdge = () => {
    if (selectedEdge) {
      removeEdge(selectedEdge.id);
    }
  };

  // No selection
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">Select a node or edge to edit its properties</p>
      </div>
    );
  }

  // Multiple selection
  if (selectedNodeIds.length > 1 || selectedEdgeIds.length > 1) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">
          {selectedNodeIds.length} nodes, {selectedEdgeIds.length} edges selected
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-4 w-full"
          onClick={() => {
            selectedNodeIds.forEach((id) => removeNode(id));
            selectedEdgeIds.forEach((id) => removeEdge(id));
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {selectedNode && (
        <>
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-3">Node Properties</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="node-label" className="text-xs">Label</Label>
                <Input
                  id="node-label"
                  value={nodeLabel}
                  onChange={(e) => handleNodeLabelChange(e.target.value)}
                  placeholder="Enter label"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="node-description" className="text-xs">Description</Label>
                <Input
                  id="node-description"
                  value={nodeDescription}
                  onChange={(e) => handleNodeDescriptionChange(e.target.value)}
                  placeholder="Enter description"
                  className="mt-1"
                />
              </div>
              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  Type: <span className="font-medium">{selectedNode.type}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Position: ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
                </p>
              </div>
            </div>
          </div>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDeleteNode}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Node
          </Button>
        </>
      )}

      {selectedEdge && (
        <>
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-3">Edge Properties</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="edge-label" className="text-xs">Stream Label</Label>
                <Input
                  id="edge-label"
                  value={edgeLabel}
                  onChange={(e) => handleEdgeLabelChange(e.target.value)}
                  placeholder="e.g., 500 kg/hr, 25°C"
                  className="mt-1"
                />
              </div>
              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  Type: <span className="font-medium">{selectedEdge.type}</span>
                </p>
                <p className="text-xs text-gray-500">
                  From: <span className="font-medium">{selectedEdge.source}</span>
                </p>
                <p className="text-xs text-gray-500">
                  To: <span className="font-medium">{selectedEdge.target}</span>
                </p>
              </div>
            </div>
          </div>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDeleteEdge}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Edge
          </Button>
        </>
      )}
    </div>
  );
}
