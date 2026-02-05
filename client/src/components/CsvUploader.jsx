import { useState } from "react";
import { uploadLeagueCSV } from "../services/api";

function CsvUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [weekNum, setWeekNum] = useState("");

  const handleFileChange = (e) => {
    // Standard HTML file input gives you a FileList
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus("Uploading...");

      // This calls the function we wrote in Step 1
      const result = await uploadLeagueCSV(id, selectedFile);

      setUploadStatus(
        `Success! Processed ${result.matches_processed} matches.`,
      );
      // Optional: Refresh your data here
    } catch (error) {
      console.error(error);
      setUploadStatus("Failed to upload.");
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Upload Weekly Predictions</h3>
      </div>

      {/* Control Bar Container */}
      <div className="flex gap-4 items-end">
        {/* 1. Week Selector (Small, fixed width) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Week #
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={weekNum}
            onChange={(e) => setWeekNum(e.target.value)}
            className="block w-20 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-slate-400
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 2. File Input (Takes remaining space) */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100
          border border-gray-300 rounded-md cursor-pointer"
            // Added border to main input so it matches the week selector height
          />
        </div>

        {/* 3. Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !weekNum} // Disable if no week selected
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-[42px]"
          // h-[42px] forces it to match the height of standard Tailwind inputs
        >
          Upload
        </button>
      </div>

      {uploadStatus && (
        <div
          className={`mt-4 p-3 rounded text-sm ${uploadStatus.includes("Success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {uploadStatus}
        </div>
      )}
    </div>
  );
}
export default CsvUploader;
