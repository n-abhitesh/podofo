function ProgressBar({ progress = 0, showLabel = true }) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar-fill"
        style={{ width: `${clampedProgress}%` }}
      >
        {showLabel && clampedProgress > 10 && `${Math.round(clampedProgress)}%`}
      </div>
    </div>
  );
}

export default ProgressBar;
