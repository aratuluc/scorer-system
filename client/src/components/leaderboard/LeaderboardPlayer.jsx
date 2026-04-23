export default function LeaderboardPlayer({ playerData }) {
  const determineColor = (rank) => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return "rgb(229 231 235)"; // Gray-200
  };

  return (
    <div
      className="flex justify-between items-center rounded-full py-1 px-4"
      style={{ backgroundColor: determineColor(playerData.rank) }}
    >
      <span className="font-bold text-xl">{playerData.name}</span>
      <span className="font-bold">{playerData.points}</span>
    </div>
  );
}
