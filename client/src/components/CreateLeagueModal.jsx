// src/components/CreateLeagueModal.jsx
import { useState } from "react";
import { createLeague } from "../services/api";

// We pass 'onClose' to close the window, and 'onLeagueCreated' to update the list
function CreateLeagueModal({ onClose, onLeagueCreated }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    // 1. Validation
    if (!name.trim()) {
      setError("League name cannot be empty.");
      return;
    }
    if (name.length < 3) {
      setError("Name is too short (min 3 chars).");
      return;
    }
    if (!year) {
      setError("Start year is required.");
      return;
    }

    try {
      // 2. API Call
      // Ensure your backend expects 'start_year' as an integer
      const newLeague = await createLeague({
        name: name,
        start_year: parseInt(year),
      });

      // 3. Success: Tell the parent and close
      onLeagueCreated(newLeague);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save. Server might be down.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h3 className="text-xl font-bold mb-4">Create New League</h3>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full border p-2 rounded mb-4 basis-2/3 ${error ? "border-red-500" : "border-gray-300"}`}
          />
          <input
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full border p-2 rounded mb-4 basis-1/3 border-gray-300"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateLeagueModal;
