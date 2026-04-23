import { useEffect, useState } from "react";
import Modal from "./Modal";

function SingleModal({ isOpen, onClose, title, value, onSave }) {
  const [string, setString] = useState("");

  useEffect(() => {
    if (value) {
      setString(value);
    } else {
      setString("");
    }
  }, [isOpen, value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(string);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <input
          className="border p-2 w-full"
          value={string}
          autoFocus
          onChange={(e) => setString(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white p-2 mt-4 rounded"
          type="submit"
        >
          Done
        </button>
      </form>
    </Modal>
  );
}
export default SingleModal;
