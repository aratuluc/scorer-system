import { useEffect, useState } from "react";
// Make sure to import addPlayer and deletePlayer!
import {
  editPlayer,
  getPlayers,
  addPlayer,
  deletePlayer,
} from "../../services/api";
import PlayerModal from "./PlayerModal";

function PlayerList({ league_id, refreshKey }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [players, setPlayers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const refreshPlayers = () => {
    getPlayers(league_id)
      .then(setPlayers)
      .catch((err) => console.error("Failed to refresh players:", err));
  };

  const handleSave = async (formData) => {
    try {
      if (selectedPlayer) {
        console.log("Updating:", selectedPlayer.id, formData.name);
        await editPlayer(league_id, selectedPlayer.id, {
          ...selectedPlayer,
          name: formData.name,
        });
      } else {
        console.log("Creating New Player:", formData.name);
        await addPlayer(league_id, { name: formData.name });
      }
      refreshPlayers();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deletePlayer(league_id, id);
      refreshPlayers();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const openAddModal = () => {
    setSelectedPlayer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (player) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const onClose = () => {
    setSelectedPlayer(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    refreshPlayers();
  }, [league_id, refreshKey]);

  return (
    <div>
      <div className="p-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar pb-6 pt-0 divide-y border-l-2 border-blue-200 ml-4 shadow-inner">
        {players.map((player) => (
          <div key={player.id} className="flex justify-between items-center">
            <div className="py-2 text-gray-700">{player.name}</div>
            <div className="flex gap-2">
              <button
                onClick={() => openEditModal(player)}
                className="border rounded shadow px-2  h-6 text-xs font-medium hover:bg-gray-200 flex items-center"
              >
                Edit
              </button>
              <button
                onClick={() => handleRemove(player.id)}
                className="border border-red-400 rounded shadow bg-red-100 px-2 h-6 text-xs font-medium hover:bg-red-200 flex items-center"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <div className="pt-4">
          <button
            onClick={openAddModal}
            className="border border-green-400 rounded shadow bg-green-100 px-2 h-6 text-xs font-medium hover:bg-green-200 flex items-center"
          >
            +
          </button>
        </div>
      </div>
      <PlayerModal
        isOpen={isModalOpen}
        onClose={onClose}
        title={selectedPlayer ? "Edit Player" : "Add Player"}
        player={selectedPlayer}
        onSave={handleSave}
      />
    </div>
  );
}
export default PlayerList;
