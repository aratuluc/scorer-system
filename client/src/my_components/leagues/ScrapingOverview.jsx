import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  getLinks,
  getLeague,
  addLink,
  deleteLink,
  initializeLeague,
  finalizePredictions,
  initializeWeeksAPI,
  fetchAllScores,
  autofillPredictionsAPI,
} from "../../services/api";
import Header from "../common/Header";
import ControlButton from "../common/ControlButton";
import InfoPanel from "../common/InfoPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { rebuildEntireLeaderboard } from "@/services/leaderboard_api";

function ScrapingOverview() {
  const { id } = useParams();
  const [links, setLinks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState("");
  const [currentAlias, setCurrentAlias] = useState("");
  const [statusText, setCurrentStatusText] = useState("");
  const [panelStatus, setPanelStatus] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    refreshLinks();
  }, [id]);

  const refreshLinks = () => {
    getLinks(id)
      .then(setLinks)
      .catch((err) => console.log(err));
  };

  const onSave = async (string, alias) => {
    await addLink(id, { link: string, alias: alias });
    refreshLinks();
  };

  const handleDelete = async (link_id) => {
    await deleteLink(link_id, id);
    refreshLinks();
  };

  const onInitialize = async () => {
    setLoadingAction("initialize");
    setCurrentStatusText("Initializing the league...");
    setPanelStatus("info");

    try {
      const response = await initializeLeague(id);
      setCurrentStatusText(
        response.detail || "League initialized successfully.",
      );
      setPanelStatus("success");
    } catch (error) {
      setPanelStatus("error");
      if (error.response) {
        const serverMsg =
          error.response.data?.detail || "Server error occurred.";
        setCurrentStatusText(serverMsg);
      } else if (error.request) {
        setCurrentStatusText("Network Error: Could not reach the server.");
      } else {
        setCurrentStatusText(`Unexpected Error: ${error.message}`);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const onFinalize = async () => {
    setLoadingAction("finalize");
    setCurrentStatusText("Finalizing the predictions...");
    setPanelStatus("info");

    try {
      const response = await finalizePredictions(id);
      setCurrentStatusText(
        response
          ? `Finalized ${response} predictions.`
          : "Finalized predictions.",
      );
    } catch (error) {
      if (error.response) {
        const serverMsg =
          error.response.data?.detail || "Server error occurred.";
        setCurrentStatusText(serverMsg);
      } else if (error.request) {
        setCurrentStatusText("Network Error: Could not reach the server.");
      } else {
        setCurrentStatusText(`Unexpected Error: ${error.message}`);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const initializeWeeks = async () => {
    setLoadingAction("finalize");
    setCurrentStatusText("Initializing Weeks...");
    setPanelStatus("info");

    try {
      const response = await initializeWeeksAPI(id);
      setCurrentStatusText(
        response
          ? `Initialized ${response.initialized} weeks.`
          : "Initialized weeks.",
      );
    } catch (error) {
      setCurrentStatusText("Failed to initialize weeks.");
      setPanelStatus("error");
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchScores = async () => {
    setLoadingAction("fetchAll");
    setCurrentStatusText("Fetching scores for all weeks...");
    setPanelStatus("info");

    try {
      const response = await fetchAllScores(id);
      setCurrentStatusText(`Found scores for ${response.count} matches`);
    } catch (error) {
      setCurrentStatusText("Failed to fetch scores...");
      setPanelStatus("error");
    } finally {
      setLoadingAction(null);
    }
  };

  const autofillPredictions = async () => {
    actionButtonHelper("autofill", "Trying to autofill predictions...", "info");

    try {
      const response = await autofillPredictionsAPI(id);
      setCurrentStatusText(
        `Successfully generated ${response.filled} predictions.`,
      );
    } catch (error) {
      setCurrentStatusText("Error occured while trying to autofill");
      setPanelStatus("error");
    } finally {
      setLoadingAction(null);
    }
  };

  const actionButtonHelper = (actionCode, actionMessage, panelAction) => {
    setLoadingAction(actionCode);
    setCurrentStatusText(actionMessage);
    setPanelStatus(panelAction);
  };

  // Completed TanStack useMutation configuration with explicit lifecycle status tracking
  const rebuildLeaderboardMutation = useMutation({
    mutationFn: () => rebuildEntireLeaderboard(id),
    onMutate: () => {
      setLoadingAction("rebuildLeaderboard");
      setCurrentStatusText(
        "Rebuilding the entire leaderboard snapshot cache...",
      );
      setPanelStatus("info");
    },
    onSuccess: (response) => {
      setCurrentStatusText(
        response?.detail ||
          "Leaderboard cache successfully rebuilt from scratch!",
      );
      setPanelStatus("success");
    },
    onError: (error) => {
      setPanelStatus("error");
      const serverMsg =
        error.response?.data?.detail || "Failed to rebuild leaderboard.";
      setCurrentStatusText(serverMsg);
    },
    onSettled: () => {
      setLoadingAction(null);
    },
  });

  return (
    <div className="mt-8 border-t border-border pt-4">
      <div className="grid grid-cols-3 items-center mb-6">
        <Link
          to="./.."
          className="justify-self-start text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
        <Header
          className="col-start-2 justify-self-center"
          title={"Admin Panel"}
        />
      </div>

      {statusText && (
        <Alert
          onClick={() => setCurrentStatusText("")}
          className={panelStatus === "error" ? "bg-red-100 border-red-300" : ""}
        >
          <AlertDescription
            className={`text-lg ${panelStatus === "error" ? "text-red-900 font-medium" : ""}`}
          >
            {statusText}
          </AlertDescription>
        </Alert>
      )}

      <div className="pt-4 mt-4">
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
          <ControlButton
            text={"Initialize Weeks"}
            icon={"❇️"}
            disabled={loadingAction !== null}
            onClick={initializeWeeks}
          />
          <ControlButton
            text={"Initialize Matches"}
            icon={"✳️"}
            disabled={loadingAction !== null}
            onClick={onInitialize}
          />
          <ControlButton
            text={"Fetch all Scores"}
            icon={"🔄"}
            disabled={loadingAction !== null}
            onClick={fetchScores}
          />
          <ControlButton
            text={"Finalize Predictions"}
            icon={"*"}
            disabled={loadingAction !== null}
            onClick={onFinalize}
          />
          <ControlButton
            text={"Auto-fill predictions"}
            icon={"9"}
            disabled={loadingAction !== null}
            onClick={autofillPredictions}
          />
          <ControlButton
            text={
              rebuildLeaderboardMutation.isPending
                ? "Rebuilding..."
                : "Rebuild Leaderboard"
            }
            icon={"🏆"}
            disabled={loadingAction !== null}
            onClick={() => rebuildLeaderboardMutation.mutate()}
          />
        </div>

        {/* Structured Configuration Container Dashboard Card */}
        <Card className="w-full border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">
              Competition Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Collapsible className="w-full border border-border rounded-lg overflow-hidden bg-background">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-4 py-3 h-10 font-medium text-xs hover:bg-muted/60 rounded-none border-b border-border transition-colors"
                >
                  <span>Scraping Sources Configuration</span>
                  <span className="text-muted-foreground font-mono">+/-</span>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="p-4 bg-muted/20 flex flex-col gap-4">
                <div className="bg-background rounded-lg border border-border overflow-hidden shadow-inner">
                  {links.length === 0 ? (
                    <p className="p-4 text-muted-foreground text-xs italic">
                      No links configured yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {links.map((link) => (
                        <li
                          key={link.id}
                          className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-muted-foreground flex-shrink-0">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m-15.686 0A11.953 11.953 0 0112 10.5c2.998 0 5.74-1.1 7.843-2.918m-15.686 0A8.959 8.959 0 013 12c0 .778.099 1.533.284 2.253"
                                />
                              </svg>
                            </span>

                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs font-medium truncate max-w-xs block"
                              title={link.link}
                            >
                              {link.link}
                            </a>

                            {link.alias && (
                              <span className="px-2 py-0.5 text-[10px] font-mono tracking-tight text-muted-foreground bg-muted border border-border rounded">
                                {link.alias}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() =>
                                navigator.clipboard.writeText(link.link)
                              }
                            >
                              Copy
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => handleDelete(link.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-fit self-start h-8 text-xs font-medium"
                    >
                      + Add New Source Stream
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg">
                    <DialogHeader>
                      <DialogTitle>Add New Source Stream</DialogTitle>
                      <DialogDescription>
                        Please input the tracking identifiers and target
                        competition names.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 mt-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-muted-foreground">
                          Mackolik Target Code
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 48201"
                          className="bg-background text-foreground border border-border p-2 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-ring"
                          value={currentLink}
                          onChange={(e) => setCurrentLink(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-muted-foreground">
                          Competition Stream Alias
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. World Cup or Champions League"
                          className="bg-background text-foreground border border-border p-2 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-ring"
                          value={currentAlias}
                          onChange={(e) => setCurrentAlias(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsModalOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            onSave(currentLink, currentAlias);
                            setIsModalOpen(false);
                            setCurrentLink("");
                            setCurrentAlias("");
                          }}
                        >
                          Save Stream Target
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ScrapingOverview;
