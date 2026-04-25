import clsx from 'clsx';
import toast from 'react-hot-toast';
import { type WubiSaveSlot, type WubiText } from '@/pages/hooks/wubi-typing.hook';
import classes from './SaveProgressModal.module.scss';

interface SaveProgressModalProps {
  wubiTexts: WubiText[];
  saves: WubiSaveSlot[];
  saveName: string;
  setSaveName: (name: string) => void;
  saveProgress: (name: string) => void;
  loadSave: (slot: WubiSaveSlot) => void;
  deleteSave: (id: string) => void;
  onClose: () => void;
}

export function SaveProgressModal({
  wubiTexts,
  saves,
  saveName,
  setSaveName,
  saveProgress,
  loadSave,
  deleteSave,
  onClose,
}: SaveProgressModalProps) {
  return (
    <div
      className={classes.backdrop}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={classes.panel}
        role="dialog"
        aria-modal="true"
        aria-label="保存 / 恢复进度"
      >
        <div className={classes.header}>
          <div>
            <h2 className={classes.title}>保存 / 恢复进度</h2>
            <p className={classes.desc}>
              保存当前进度后，下次可从此处继续练习。最多保存 10 条存档。
            </p>
          </div>
          <button className={classes.closeBtn} onClick={onClose} title="关闭">
            <span className="i-mdi-close" aria-hidden="true" />
          </button>
        </div>

        <div className={classes.content}>
          <div className={classes.inputRow}>
            <input
              type="text"
              className={classes.nameInput}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={`存档 ${new Date().toLocaleString('zh-CN')}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const name =
                    saveName.trim() || `存档 ${new Date().toLocaleString('zh-CN')}`;
                  saveProgress(saveName);
                  setSaveName('');
                  toast.success(`已保存「${name}」`);
                }
              }}
              autoFocus
            />
            <button
              className={clsx(classes.actionBtn, classes.actionBtnPrimary)}
              onClick={() => {
                const name =
                  saveName.trim() || `存档 ${new Date().toLocaleString('zh-CN')}`;
                saveProgress(saveName);
                setSaveName('');
                toast.success(`已保存「${name}」`);
              }}
            >
              <span className="i-mdi-content-save-outline" aria-hidden="true" />
              保存
            </button>
          </div>
          <p className={classes.shortcutHint}>
            <span className="i-mdi-keyboard-outline" aria-hidden="true" />
            也可用 <kbd>⌘S</kbd> / <kbd>Ctrl+S</kbd> 快速保存（使用默认名称）
          </p>

          {saves.length > 0 ? (
            <div className={classes.list}>
              {saves.map((slot) => (
                <div key={slot.id} className={classes.slot}>
                  <div className={classes.slotInfo}>
                    <span className={classes.slotName}>{slot.name}</span>
                    <span className={classes.slotMeta}>
                      {slot.textSource === 'preset'
                        ? (wubiTexts[slot.presetIndex]?.title ?? '预设')
                        : slot.textSource === 'custom'
                          ? '自定义文本'
                          : '错题本'}
                      {' · 第 '}
                      {slot.taskIndex + 1}
                      {slot.practiceMode === 'single' ? ' 字' : ' 段'}
                      {' · '}
                      {new Date(slot.savedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className={classes.slotActions}>
                    <button
                      className={clsx(classes.slotBtn, classes.slotBtnLoad)}
                      onClick={() => {
                        loadSave(slot);
                        toast.success(`已恢复「${slot.name}」`);
                      }}
                    >
                      <span className="i-mdi-restore" aria-hidden="true" />
                      恢复
                    </button>
                    <button
                      className={clsx(classes.slotBtn, classes.slotBtnDelete)}
                      onClick={() => deleteSave(slot.id)}
                    >
                      <span className="i-mdi-delete-outline" aria-hidden="true" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={classes.empty}>
              <span className="i-mdi-content-save-off-outline" aria-hidden="true" />
              <p>暂无存档，保存后可在此恢复进度。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
