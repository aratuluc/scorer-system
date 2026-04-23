import { useEffect, useState } from "react";

function ControlButton({ onClick, icon, text, disabled }) {
  return (
    <button
      disabled={disabled}
      className={`${disabled ? "bg-gray-100" : "bg-white"} px-2 py-4 flex items-center justify-between gap-2 rounded border shadow hover:bg-gray-100`}
      onClick={onClick}
    >
      <span className="text-xl">{icon}</span>
      {text}
    </button>
  );
}
export default ControlButton;
