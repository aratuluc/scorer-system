import { useEffect, useState } from "react";

function WeekRow({ filename, onNumberChange }) {
  const [weekNum, setWeekNum] = useState("");

  useEffect(() => {
    const re = /(?<week>\d+)/;

    const result = filename.match(re);

    if (result && result.groups && result.groups.week) {
      setWeekNum(result.groups.week);
      onNumberChange(result.groups.week);
    }
  }, [filename]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setWeekNum(val);
    onNumberChange(val);
  };

  return (
    <div className="flex items-center gap-4 pt-2">
      <div>
        <input
          type="number"
          min="1"
          max="50"
          placeholder={"Week #"}
          value={weekNum}
          onChange={handleInputChange}
          className="block w-20 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-slate-400
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
      {filename}
    </div>
  );
}

export default WeekRow;
