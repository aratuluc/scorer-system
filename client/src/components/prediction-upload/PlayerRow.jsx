function PlayerRow({ player, onSelectChange, onTextChange, players }) {
  const handleAsIs = () => onTextChange(player.name);

  return (
    <div
      className="flex justify-between items-center px-1 py-3"
      key={player.name}
    >
      <span>{player.name}</span>
      <div className="flex gap-2 items-center divide-x-2">
        {!(player.textValue || player.choiceValue !== "init") && (
          <button
            className="text-blue-600 underline hover:no-underline"
            onClick={handleAsIs}
          >
            as is
          </button>
        )}
        <input
          type="text"
          className="bg-slate-100 rounded shadow-inner h-6 w-32 px-1"
          placeholder="create new"
          value={player.textValue}
          disabled={player.choiceValue != "init"}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <select
          disabled={player.textValue}
          className="bg-gray-100 rounded h-6 shadow-inner"
          value={player.choiceValue}
          onChange={onSelectChange}
        >
          <option value="init">select existing</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
export default PlayerRow;
