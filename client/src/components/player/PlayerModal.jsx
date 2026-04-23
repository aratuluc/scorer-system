import { useEffect, useState } from "react";
import Modal from "../common/Modal";

function PlayerModal({ isOpen, onClose, onSave, title, player }) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (player && player.name) {
      setName(player.name);
    } else {
      setName("");
    }
  }, [player, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name: name });
    onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
          autoFocus
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 mt-4 rounded"
        >
          Save
        </button>
      </form>
    </Modal>
  );
}
export default PlayerModal;
