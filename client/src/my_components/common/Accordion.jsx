import { useState } from "react";

function Accordion({ title, children }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="bg-white border rounded shadow grid">
      <button
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="">{title}</span>
        <span
          className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : "rotate-0"}`}
        >
          &#x276F;
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out 
            ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="bg-gray-50 shadow-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
export default Accordion;
