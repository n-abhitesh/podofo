function AppWindow({ children, title = "Podofo — PDF Tools" }) {
  return (
    <div className="app-window">
      <div className="title-bar">
        <div className="title-bar-text">{title}</div>
        <div className="title-bar-controls">
          <button className="title-bar-button" title="Minimize">_</button>
          <button className="title-bar-button" title="Maximize">□</button>
          <button className="title-bar-button" title="Close">×</button>
        </div>
      </div>
      <div className="window-content">
        {children}
      </div>
    </div>
  );
}

export default AppWindow;
