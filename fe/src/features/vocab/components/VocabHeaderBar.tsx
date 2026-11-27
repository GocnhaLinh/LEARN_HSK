import { Download, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import React from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';

interface VocabHeaderBarProps {
  totalVocabCount: number;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (rawJson: string) => void | Promise<void>;
}

export const VocabHeaderBar: React.FC<VocabHeaderBarProps> = React.memo(
  ({ totalVocabCount, onExportCsv, onExportJson, onImportJson }) => {
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => onImportJson(String(ev.target?.result || ''));
      reader.readAsText(file);
      e.target.value = '';
    };

    return (
      <Card
        variant="flat"
        padding="none"
        className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">
            [06] VOCABULARY ARCHIVE &amp; BACKUP
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-serif font-bold text-2xl">Kho từ HSK 3.0</h2>
            <Badge variant="yellow" className="px-2 py-0.5 text-xs">
              {totalVocabCount.toLocaleString('vi-VN')} từ
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 font-mono text-[11px] sm:text-xs font-bold">
          <Button
            variant="primary"
            className="px-3 py-2 whitespace-nowrap"
            leftIcon={<Plus className="w-4 h-4 shrink-0" />}
            onClick={() => useVocabUiStore.getState().openAddModal()}
          >
            Thêm từ
          </Button>
          <Button
            variant="mint"
            className="px-3 py-2 whitespace-nowrap"
            leftIcon={<FileSpreadsheet className="w-4 h-4 shrink-0" />}
            title="Xuất danh sách đang lọc sang Excel/CSV"
            onClick={onExportCsv}
          >
            Xuất CSV
          </Button>
          <Button
            variant="yellow"
            className="px-3 py-2 whitespace-nowrap"
            leftIcon={<Download className="w-4 h-4 shrink-0" />}
            onClick={onExportJson}
          >
            Backup JSON
          </Button>
          <label className="t-btn px-3 py-2 bg-white text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-[#F4C2D7]">
            <Upload className="w-4 h-4 shrink-0" />
            <span>Khôi phục JSON</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </label>
        </div>
      </Card>
    );
  },
);

VocabHeaderBar.displayName = 'VocabHeaderBar';
