import { useState } from 'react';
import Button from './Button';

function SplitOptions({ onSplit, disabled, totalPages }) {
  const [mode, setMode] = useState('all');
  const [rangeInput, setRangeInput] = useState('');
  const [fixedSize, setFixedSize] = useState(1);

  const parseRanges = (input) => {
    const parts = input.split(',').map(p => p.trim());
    const ranges = [];
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= start && end <= totalPages) {
          ranges.push(`${start}-${end}`);
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          ranges.push(num);
        }
      }
    }
    
    return ranges;
  };

  const handleSplit = () => {
    let ranges = [];
    
    if (mode === 'all') {
      // No ranges needed - will extract all pages
    } else if (mode === 'range') {
      ranges = parseRanges(rangeInput);
      if (ranges.length === 0) {
        return;
      }
    } else if (mode === 'fixed') {
      const size = parseInt(fixedSize);
      if (isNaN(size) || size < 1) {
        return;
      }
    }
    
    onSplit({ mode, ranges, fixedSize: parseInt(fixedSize) || 1 });
  };

  return (
    <div className="split-options">
      <div className="form-group">
        <label className="form-label">Split Mode:</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="splitMode"
              value="all"
              checked={mode === 'all'}
              onChange={(e) => setMode(e.target.value)}
            />
            <span>Split all pages (each page as separate PDF)</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="splitMode"
              value="range"
              checked={mode === 'range'}
              onChange={(e) => setMode(e.target.value)}
            />
            <span>Split by range (e.g., 1-3, 5, 7-9)</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="splitMode"
              value="fixed"
              checked={mode === 'fixed'}
              onChange={(e) => setMode(e.target.value)}
            />
            <span>Split into fixed ranges (every N pages)</span>
          </label>
        </div>
      </div>

      {mode === 'range' && (
        <div className="form-group">
          <label className="form-label">Ranges:</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., 1-3, 5, 7-9"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
          />
          <div className="form-hint">Total pages: {totalPages || '?'}</div>
        </div>
      )}

      {mode === 'fixed' && (
        <div className="form-group">
          <label className="form-label">Pages per PDF:</label>
          <input
            type="number"
            className="form-input"
            min="1"
            value={fixedSize}
            onChange={(e) => setFixedSize(e.target.value)}
          />
        </div>
      )}

      <div className="action-buttons">
        <Button onClick={handleSplit} disabled={disabled}>
          Split PDF
        </Button>
      </div>
    </div>
  );
}

export default SplitOptions;
