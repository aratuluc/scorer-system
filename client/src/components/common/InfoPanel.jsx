export default function InfoPanel({ status = "info", children, onDismiss }) {
  const styles = {
    success: "bg-green-100 border-green-500 text-green-800",
    error: "bg-red-100 border-red-500 text-red-800",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-800",
    info: "bg-blue-100 border-blue-500 text-blue-800",
  };

  // 2. Grab the classes based on the prop (fallback to info if invalid)
  const activeStyle = styles[status] || styles.info;

  return (
    <div
      className={`border-l-4 p-4 w-full rounded-r ${activeStyle} ${onDismiss ? "cursor-pointer hover:opacity-75 transition" : ""}`}
      onClick={() => onDismiss && onDismiss()}
    >
      <div className="font-medium">{children}</div>
    </div>
  );
}
