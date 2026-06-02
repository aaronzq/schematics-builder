import { captureSceneSnapshot, restoreSceneSnapshot, areSnapshotsEqual } from './HistorySnapshots.js';

const DEFAULT_HISTORY_LIMIT = 100;

class ActionHistory {
  constructor(limit = DEFAULT_HISTORY_LIMIT) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
    this.activeAction = null;
    this.isApplyingHistory = false;
    this.listeners = new Set();
  }

  run(label, type, fn) {
    if (this.isApplyingHistory) return fn();
    if (this.activeAction) this.commit();

    const before = captureSceneSnapshot();
    try {
      const result = fn();
      const after = captureSceneSnapshot();
      this._pushIfChanged({ label, type, before, after });
      return result;
    } catch (error) {
      throw error;
    }
  }

  begin(label, type) {
    if (this.isApplyingHistory) return;
    if (this.activeAction) return;
    this.activeAction = {
      label,
      type,
      before: captureSceneSnapshot()
    };
  }

  commit() {
    if (!this.activeAction) return false;

    const action = {
      ...this.activeAction,
      after: captureSceneSnapshot()
    };
    this.activeAction = null;
    return this._pushIfChanged(action);
  }

  cancel() {
    this.activeAction = null;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.activeAction = null;
    this._notify();
  }

  undo() {
    if (!this.canUndo() || this.isApplyingHistory) return false;
    const action = this.undoStack.pop();
    this._apply(action.before);
    this.redoStack.push(action);
    this._notify();
    return true;
  }

  redo() {
    if (!this.canRedo() || this.isApplyingHistory) return false;
    const action = this.redoStack.pop();
    this._apply(action.after);
    this.undoStack.push(action);
    this._notify();
    return true;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this);
    return () => this.listeners.delete(listener);
  }

  _pushIfChanged(action) {
    if (!action.before || !action.after || areSnapshotsEqual(action.before, action.after)) {
      return false;
    }

    this.undoStack.push({
      ...action,
      timestamp: Date.now()
    });

    if (this.undoStack.length > this.limit) {
      this.undoStack.splice(0, this.undoStack.length - this.limit);
    }

    this.redoStack = [];
    this._notify();
    return true;
  }

  _apply(snapshot) {
    this.cancel();
    this.isApplyingHistory = true;
    try {
      restoreSceneSnapshot(snapshot);
    } finally {
      this.isApplyingHistory = false;
    }
  }

  _notify() {
    this.listeners.forEach(listener => listener(this));
  }
}

export const actionHistory = new ActionHistory();
