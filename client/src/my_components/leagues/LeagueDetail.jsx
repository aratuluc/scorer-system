import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLinks,
  getLeague,
  getMatches,
  sendUnsetFix,
  getStagingMatches,
} from "../../services/api";
import { Button } from "@/components/ui/button";
import Header from "../common/Header";
import CsvUploader from "../prediction-upload/CsvUploader";
import PlayerList from "../player/PlayerList";
import Accordion from "../common/Accordion";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function LeagueDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [links, setLinks] = useState([]);
  const [league, setLeague] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 1. Fetch Staging Matches
  const { data: stagingMatches = [], isLoading: isStagingLoading } = useQuery({
    queryKey: ["stagingMatches", id],
    queryFn: () => getStagingMatches(id),
  });

  // 2. Fetch All Matches and filter down to Unset Matches
  const { data: unsetMatches = [] } = useQuery({
    queryKey: ["matches", id],
    queryFn: () => getMatches(id, true, 0),
  });
  // 3. Mutation to submit fixes and clear state automatically
  const fixMutation = useMutation({
    mutationFn: (payload) => sendUnsetFix(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stagingMatches", id] });
      queryClient.invalidateQueries({ queryKey: ["matches", id] });
    },
  });

  // Legacy state fetches
  useEffect(() => {
    getLinks(id)
      .then(setLinks)
      .catch((err) => console.log(err));
  }, [id]);

  useEffect(() => {
    getLeague(id)
      .then(setLeague)
      .catch((err) => console.error(err));
  }, [id]);

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

      {/* Staging Matches Card Section */}
      <div className="mt-8">
        {isStagingLoading ? (
          <div className="flex justify-center p-4">
            <Spinner />
          </div>
        ) : (
          <StagingMatchesCard
            stagingMatches={stagingMatches}
            unsetMatches={unsetMatches}
            fixMutation={fixMutation}
          />
        )}
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
        <Button size="lg" asChild>
          <Link to={"./scrape"}>Go To Scraping Overview</Link>
        </Button>

        <Button size="lg" asChild>
          <Link to={"./weeks"}>Go To Week Overview</Link>
        </Button>
      </div>
    </div>
  );
}

export function StagingMatchesCard({
  stagingMatches,
  unsetMatches,
  fixMutation,
}) {
  const [fixes, setFixes] = useState({});

  const handleChangeForStagings = (stagingId, realMatchId) => {
    setFixes((prev) => ({
      ...prev,
      [stagingId]: Number(realMatchId),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center w-full p-2">
          <div>
            <CardTitle>Staging Matches</CardTitle>
            <CardDescription>
              {stagingMatches.length > 0
                ? `There are ${stagingMatches.length} staging matches requiring alignment`
                : "No unmatched staging records found."}
            </CardDescription>
          </div>

          <Button
            onClick={() => fixMutation.mutate(fixes)}
            disabled={Object.keys(fixes).length === 0 || fixMutation.isPending}
          >
            Submit Alignment{" "}
            {fixMutation.isPending && <Spinner className="ml-2" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="divide-y border-t mt-2">
        {stagingMatches.map((match) => (
          <div
            className="flex justify-between items-center py-3 px-1"
            key={match.id}
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-sm text-foreground">
                {match.home_team} vs. {match.away_team}
              </span>
              <span className="w-max px-2 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded">
                Parsed Week {match.scored_week}
              </span>
            </div>

            <Select
              value={fixes[match.id] ? String(fixes[match.id]) : ""}
              onValueChange={(val) => handleChangeForStagings(match.id, val)}
            >
              <SelectTrigger className="w-[320px] bg-background border-muted text-left font-normal">
                <SelectValue placeholder="Map to Database Fixture..." />
              </SelectTrigger>

              <SelectContent>
                {unsetMatches.map((unset) => {
                  const unsetStrId = String(unset.id);
                  return (
                    <SelectItem
                      key={`staging-fix-option-${match.id}-${unset.id}`}
                      value={unsetStrId}
                    >
                      {`${unset.home_team} vs ${unset.away_team} (Wk ${unset.fixture_week})`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default LeagueDetail;
