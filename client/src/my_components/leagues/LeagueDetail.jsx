import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLinks, getLeague } from "../../services/api";
import { Button } from "@/components/ui/button";
import Header from "../common/Header";
import CsvUploader from "../prediction-upload/CsvUploader";
import PlayerList from "../player/PlayerList";
import Accordion from "../common/Accordion";

function LeagueDetail() {
  const { id } = useParams();
  const [links, setLinks] = useState([]);
  const [league, setLeague] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getLinks(id)
      .then(setLinks)
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    getLeague(id)
      .then(setLeague)
      .catch((err) => console.error(err));
  }, []);

  const refreshPlayers = () => {
    setRefreshKey((a) => a + 1);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 items-center mb-4">
        <Link
          to="./.."
          className="justify-self-start text-blue-500 hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
        <Header
          className="col-start-2 justify-self-center"
          title={"Admin Panel"}
        />
      </div>

      <h2 className="font-bold text-3xl pt-4">
        {league.name}{" "}
        <span className="text-gray-500 text-sm">({league.start_year})</span>
      </h2>

      <div className="mt-8 border-t pt-4">
        <CsvUploader refreshPlayers={refreshPlayers} />
      </div>

      <div className="mt-8 border-t pt-4">
        <Accordion title={"Players"}>
          <div className="px-4">
            <PlayerList league_id={id} key={refreshKey} />
          </div>
        </Accordion>
      </div>

      <h3 className="mt-10 font-bold text-lg border-t p-2 pt-4">Links</h3>

      <div className="flex gap-4">
        <Button size="lg">
          <Link className="" to={"./scrape"}>
            <span>Go To Scraping Overview</span>
          </Link>
        </Button>

        <Button size="lg">
          <Link className="" to={"./weeks"}>
            <span>Go To Week Overview</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default LeagueDetail;
