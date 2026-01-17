function StatusBar({ status = "Ready", rightContent = null }) {
  return (
    <div className="status-bar">
      <div className="status-bar-left">{status}</div>
      {rightContent && <div className="status-bar-right">{rightContent}</div>}
    </div>
  );
}

export default StatusBar;
