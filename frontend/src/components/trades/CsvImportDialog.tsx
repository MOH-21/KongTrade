import { useState, useRef } from "react";
import { X, UploadCloud } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { tradesApi } from "@/api/endpoints";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CsvImportDialog({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (f: File) => tradesApi.importCsv(f),
    onSuccess: (data) => {
      toast.success(data.message);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Import failed");
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) setFile(f);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Import CSV</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/20 py-12 transition-colors hover:bg-muted/40"
          >
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Expects: symbol, side, quantity, entry_price, exit_price, entry_time, exit_time, fees
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
          </div>
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</button>
            <button
              onClick={() => file && importMutation.mutate(file)}
              disabled={!file || importMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
