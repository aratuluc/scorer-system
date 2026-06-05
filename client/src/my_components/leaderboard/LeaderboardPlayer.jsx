export default function LeaderboardPlayer({ playerData, rank, onClick }) {
  const determineColor = (rank) => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return "rgb(229 231 235)"; // Gray-200
  };

  return (
    <button onClick={() => onClick(playerData.id)}>
      <div className="flex bg-gray-200 hover:bg-gray-300 transition-transform hover:translate-x-2 justify-between items-center rounded-full py-1 px-4">
        <span>
          <span className="font-semibold text-l text-gray-700">{rank}. </span>
          <span className="font-bold text-xl">{playerData.name}</span>
        </span>
        <span className="font-bold">{playerData.points}</span>
      </div>
    </button>
  );
}
