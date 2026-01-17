import Button from './Button';

function AlertDialog({ show, title, message, onClose }) {
  if (!show) return null;

  return (
    <div className="alert-dialog">
      <div className="alert-dialog-title">{title}</div>
      <div className="alert-dialog-content">{message}</div>
      <div className="alert-dialog-buttons">
        <Button onClick={onClose}>OK</Button>
      </div>
    </div>
  );
}

export default AlertDialog;
