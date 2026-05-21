import { use, useEffect, useState } from "react";
import { sendUnknownFix, uploadLeagueCSV } from "../../services/api";
import { useParams, Link } from "react-router-dom";
import UnknownModal from "./UnknownModal";
import WeekRow from "./WeekRow";

function CsvUploader({ refreshPlayers }) {
  const { id } = useParams();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [weekNum, setWeekNum] = useState("");
  const [unknown_players, setUnknownPlayers] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileData, setFileData] = useState({});

  const handleFileChange = (e) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setSelectedFiles(fileArray);

      const initialData = {};
      fileArray.forEach((file) => {
        initialData[file.name] = "";
      });
      setFileData(initialData);
    }
  };

  const updateFileWeek = (filename, newWeekNum) => {
    setFileData((prev) => ({
      ...prev,
      [filename]: newWeekNum,
    }));
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploadStatus("Uploading...");

      const uploadTasks = selectedFiles.map((file) => {
        const weekNum = fileData[file.name];

        return uploadLeagueCSV(id, weekNum, file);
      });

      const results = await Promise.all(uploadTasks);

      let totalProcessed = 0;
      let allUnknownPlayers = [];

      results.forEach((result) => {
        if (result && result.unknown_players) {
          allUnknownPlayers = [...allUnknownPlayers, ...result.unknown_players];
        }

        if (result && result.total_processed) {
          totalProcessed += result.total_processed;
        }
      });

      if (allUnknownPlayers.length > 0) {
        setUploadStatus(
          `Warning: There were ${allUnknownPlayers.length} unknown players.`,
        );
        setUnknownPlayers(allUnknownPlayers);
      } else {
        setUploadStatus(`Success! Processed ${totalProcessed} matches.`);
      }
    } catch (error) {
      console.error(error);
      setUploadStatus("Failed to upload one or more files.");
    }
  };

  const getStatusColor = (string) => {
    if (string.includes("Success")) return "bg-green-50 text-green-800";
    if (string.includes("Warning:")) return "bg-yellow-50 text-yellow-800";
    return "bg-red-50 text-red-800";
  };

  const onFix = async (data) => {
    const response = await sendUnknownFix(id, data);
    setUploadStatus(response.text);
    refreshPlayers();
    setUnknownPlayers([]);
  };

  const isFormDataValid = () => {
    // 1. Extract all the week numbers into a standard array
    const allWeeks = Object.values(fileData);

    // 2. Check if EVERY item passes our test (not empty string, not null)
    return allWeeks.every((week) => week !== "" && week !== null);
  };

  return (
    <div className="bg-white p-6 rounded shadow mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Upload Weekly Predictions</h3>
      </div>
      {/* Control Bar Container */}
      <div className="flex gap-4 items-end">
        {/* 2. File Input (Takes remaining space) */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select CSV File(s)
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
            multiple
          />
        </div>

        {/* 3. Upload Button */}
        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || !isFormDataValid()}
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-[42px]"
        >
          Upload
        </button>
      </div>

      <div className="flex flex-col gap-2 divide-y">
        {selectedFiles &&
          selectedFiles.map((file, index) => (
            <WeekRow
              key={file + index}
              filename={file.name}
              onNumberChange={(newWeek) => updateFileWeek(file.name, newWeek)}
            />
          ))}
      </div>

      {uploadStatus && (
        <div
          className={`flex items-center justify-between mt-4 p-3 rounded text-sm ${getStatusColor(uploadStatus)}`}
        >
          {uploadStatus}{" "}
          {unknown_players && unknown_players.length > 0 && (
            <button
              onClick={() => {
                setIsModalOpen((a) => !a);
              }}
              className={`rounded text-sm p-2 bg-yellow-500 text-gray-700 font-bold`}
            >
              Details
            </button>
          )}
        </div>
      )}
      <UnknownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unknownPlayers={unknown_players}
        onSave={onFix}
      ></UnknownModal>
    </div>
  );
}
export default CsvUploader;
