import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import PlayerRow from "./PlayerRow";
import { useParams } from "react-router-dom";
import { getPlayers } from "../../services/api";

function UnknownModal({ isOpen, onClose, onSave, unknownPlayers }) {
  const [unkPlayers, setUnkPlayers] = useState([]);
  const [realPlayers, setRealPlayers] = useState([]);

  const { id } = useParams();
  useEffect(() => {
    getPlayers(id)
      .then(setRealPlayers)
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (!unknownPlayers) return;
    setUnkPlayers(
      unknownPlayers.map((player) => ({
        name: player.name,
        data: player.preds,
        week_num: player.week,
        textValue: "",
        choiceValue: "init",
      })),
    );
  }, [unknownPlayers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(unkPlayers);
    onClose();
  };

  const handleRowChange = (index, field, value) => {
    setUnkPlayers((old) => {
      const newList = [...old];
      const newRow = { ...newList[index] };

      newRow[field] = value;
      newList[index] = newRow;
      return newList;
    });
  };

  const isFormValid =
    unkPlayers.length > 0 &&
    unkPlayers.every(
      (p) => p.textValue.trim() !== "" || p.choiceValue !== "init",
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={"Unknown Players"}>
      <form onSubmit={handleSubmit}>
        <div className="grid divide-y-2 overflow-auto max-h-[400px]">
          {unkPlayers &&
            unkPlayers.map((player, index) => (
              <PlayerRow
                key={player.name}
                player={player}
                onTextChange={(val) => handleRowChange(index, "textValue", val)}
                onSelectChange={(e) =>
                  handleRowChange(index, "choiceValue", e.target.value)
                }
                players={realPlayers}
              />
            ))}
        </div>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!isFormValid}
            className={`bg-blue-600 text-white p-2 mt-4 rounded ${!isFormValid ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default UnknownModal;
