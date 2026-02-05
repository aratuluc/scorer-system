import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLinks } from "../services/api";
import Header from "./Header";

function Leaderboard() {
  const { id } = useParams();
  const [links, setLinks] = useState([]);

  return (
    <div>
      <Header title={`League ${id}`} />
    </div>
  );
}

export default Leaderboard;
