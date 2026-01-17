import { useState } from 'react';

function ReorderableFileList({ files, onReorder, onRemove }) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const draggedItem = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    onReorder(newFiles);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newFiles = [...files];
    [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    onReorder(newFiles);
  };

  const moveDown = (index) => {
    if (index === files.length - 1) return;
    const newFiles = [...files];
    [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
    onReorder(newFiles);
  };

  return (
    <ul className="file-list reorderable-list">
      {files.map((file, index) => (
        <li
          key={index}
          className={`file-item ${draggedIndex === index ? 'dragging' : ''}`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
        >
          <span className="file-item-order">{index + 1}</span>
          <span className="file-item-name" title={file.name}>{file.name}</span>
          <div className="file-item-controls">
            <button
              className="file-item-btn"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              title="Move up"
            >
              ↑
            </button>
            <button
              className="file-item-btn"
              onClick={() => moveDown(index)}
              disabled={index === files.length - 1}
              title="Move down"
            >
              ↓
            </button>
            <button
              className="file-item-remove"
              onClick={() => onRemove(index)}
              title="Remove"
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default ReorderableFileList;
