import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getLinks,
  getLeague,
  getMatches,
  sendUnknownFix,
  sendUnsetFix,
  getStagingMatches,
} from "../../services/api";
import { Button } from "@/components/ui/button";
import Header from "../common/Header";
import CsvUploader from "../prediction-upload/CsvUploader";
import PlayerList from "../player/PlayerList";
import Accordion from "../common/Accordion";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

function LeagueDetail() {
  const { id } = useParams();
  const [links, setLinks] = useState([]);
  const [league, setLeague] = useState([]);
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

      <StagingMatches></StagingMatches>

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

function StagingMatches({}) {
  const { id } = useParams();
  const [fixes, setFixes] = useState({});
  const queryClient = useQueryClient();
  const {
    data: stagingMatches,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stagingMatches", id],
    queryFn: () => getStagingMatches(id),
  });

  const {
    data: unsetMatches,
    isLoading: isUnsetLoading,
    isError: isUnsetError,
  } = useQuery({
    queryKey: ["unsetMatches", id],
    queryFn: () => getMatches(id, true, 0),
  });

  const fixMutation = useMutation({
    mutationFn: (payload) => sendUnsetFix(id, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stagingMatches", id] });

      setFixes({});
    },

    onError: (error) => {
      console.error("The backend rejected the fix:", error);
    },
  });

  const handleChangeForStagings = (staging, unset) => {
    console.log(staging, unset);
    setFixes((prev) => ({ ...prev, [staging]: unset }));
  };

  if (isLoading || isUnsetLoading) return <Spinner></Spinner>;

  return (
    <div>
      {
        <div className="mt-8 border-t pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Staging Matches</CardTitle>
              <CardDescription>{`There are ${stagingMatches.length || "none"} staging matches`}</CardDescription>
              <CardAction>
                <Button
                  onClick={() => fixMutation.mutate(fixes)}
                  disabled={
                    Object.keys(fixes).length === 0 || fixMutation.isPending
                  }
                >
                  Submit
                  {fixMutation.isPending && <Spinner />}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className={"divide-y"}>
              {stagingMatches.map((match) => (
                <div
                  className="flex justify-between items-center"
                  key={match.id}
                >
                  <div className="flex gap-2">
                    <span>
                      {match.home_team} vs. {match.away_team}
                    </span>
                    <span className="text-xs text-blue-500 border rounded bg-blue-100">
                      Week {match.scored_week}
                    </span>
                  </div>

                  <Combobox
                    onValueChange={(value) =>
                      handleChangeForStagings(match.id, value)
                    }
                    className="w-max"
                    items={unsetMatches}
                    itemToStringValue={(unset) =>
                      `${unset.home_team} - ${unset.away_team} : ${unset.fixture_week}`
                    }
                  >
                    <ComboboxInput placeholder="Select a match" />
                    <ComboboxContent>
                      <ComboboxEmpty>No items found.</ComboboxEmpty>
                      <ComboboxList>
                        {(unset) => (
                          <ComboboxItem key={unset.id} value={unset.id}>
                            {`${unset.home_team} - ${unset.away_team} : ${unset.fixture_week}`}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      }
    </div>
  );
}

export default LeagueDetail;
