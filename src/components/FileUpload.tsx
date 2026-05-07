"use client";

import { LockKeyhole, Upload, File, X } from "lucide-react";
import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  requireAuth?: boolean;
}

export function FileUpload({ onFileSelect, accept = ".pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.html,.css,.png,.jpg,.jpeg,.doc,.docx,.xlsx", maxSizeMB = 10, requireAuth = true }: FileUploadProps) {
  const { isAuthenticated } = useAuth();
  const inputId = useId();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (requireAuth && !isAuthenticated) {
      toast.error("Login required", {
        description: "Please login before uploading files.",
      });
      return;
    }

    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      const message = `File too large. Max ${maxSizeMB}MB.`;
      setError(message);
      toast.error(message);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
    toast.success("File selected", {
      description: file.name,
    });
  }, [isAuthenticated, maxSizeMB, onFileSelect, requireAuth]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive ? "border-primary bg-secondary/50" : "border-border hover:border-primary/50"
        }`}
        onClick={() => {
          if (requireAuth && !isAuthenticated) {
            toast.error("Login required", {
              description: "Please login before uploading files.",
            });
            return;
          }
          document.getElementById(inputId)?.click();
        }}
      >
        {requireAuth && !isAuthenticated ? (
          <LockKeyhole className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        )}
        <p className="text-sm font-medium text-foreground mb-1">Drop your file here or click to browse</p>
        <p className="text-xs text-muted-foreground">
          {requireAuth && !isAuthenticated
            ? "Login is required for uploads"
            : `PDF, DOC/DOCX, XLSX, text, code, or images up to ${maxSizeMB}MB`}
        </p>
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
          <File className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground flex-1 truncate">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)}MB</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
