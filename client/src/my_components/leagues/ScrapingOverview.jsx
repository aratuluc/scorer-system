import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  initializeWeeksDeltaAPI,
  initializeMatchesDeltaAPI,
} from "../../services/api";
import AdminNav from "../common/AdminNav";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { rebuildEntireLeaderboard } from "@/services/leaderboard_api";
import { 
  RefreshCw, 
  Database, 
  Terminal, 
  Trash2, 
  Play, 
  AlertTriangle, 
  ChevronRight, 
  FolderSync, 
  Award,
  Sparkles,
  Clipboard,
  Plus,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";

function ScrapingOverview() {
  const { id } = useParams();
  const [league, setLeague] = useState(null);
  const [links, setLinks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState("");
  const [currentAlias, setCurrentAlias] = useState("");
  
  // Console state
  const [logs, setLogs] = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [confirmDestructiveReset, setConfirmDestructiveReset] = useState(false);

  useEffect(() => {
    getLeague(id)
      .then(setLeague)
      .catch((err) => console.error(err));
    refreshLinks();
  }, [id]);

  const refreshLinks = () => {
    getLinks(id)
      .then(setLinks)
      .catch((err) => console.log(err));
  };

  const addLog = (text, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, text, type }]);
  };

  const clearConsole = () => {
    setLogs([]);
  };

  const onSave = async (string, alias) => {
    await addLink(id, { link: string, alias: alias });
    refreshLinks();
    addLog(`Added source stream identifier: ${string} (${alias || "No Alias"})`, "success");
  };

  const handleDelete = async (link_id) => {
    await deleteLink(link_id, id);
    refreshLinks();
    addLog(`Deleted source stream link.`, "warning");
  };

  // 1. Unified Safe sync: delta weeks + delta matches
  const runSyncStructure = async () => {
    setActiveAction("sync_structure");
    setLogs([]);
    addLog("Starting safe delta sync for competition structure...", "info");
    
    try {
      addLog("Step 1/2: Checking and syncing weeks delta...", "info");
      const weeksRes = await initializeWeeksDeltaAPI(id);
      addLog(`Step 1/2 Complete. New weeks initialized: ${weeksRes.new_weeks_initialized}`, "success");
      
      addLog("Step 2/2: Syncing tournament fixtures delta...", "info");
      const matchesRes = await initializeMatchesDeltaAPI(id);
      addLog(`Step 2/2 Complete. New matches synchronized: ${matchesRes.new_matches_initialized}`, "success");
      
      addLog("Tournament structure is fully up-to-date and synced safely!", "success");
    } catch (error) {
      console.error(error);
      addLog(`Error syncing structure: ${error.response?.data?.detail || error.message || "Network Error"}`, "error");
    } finally {
      setActiveAction(null);
    }
  };

  // 2. Fetch all scores + finalize predictions + rebuild leaderboard cache
  const runSyncResults = async () => {
    setActiveAction("sync_results");
    setLogs([]);
    addLog("Starting score update and point calculation sync...", "info");
    
    try {
      addLog("Step 1/3: Fetching match scores from Mackolik archive...", "info");
      const fetchRes = await fetchAllScores(id);
      addLog(`Step 1/3 Complete. Found and updated scores for ${fetchRes.count} matches.`, "success");
      if (fetchRes.is_live) {
        addLog("Note: Live matches currently playing. Results will sync continuously.", "warning");
      }
      
      addLog("Step 2/3: Finalizing predictions and evaluating scores...", "info");
      const finalizeCount = await finalizePredictions(id);
      addLog(`Step 2/3 Complete. Finalized and graded ${finalizeCount} predictions.`, "success");
      
      addLog("Step 3/3: Rebuilding master season leaderboard snapshots...", "info");
      const rebuildRes = await rebuildEntireLeaderboard(id);
      addLog(`Step 3/3 Complete. ${rebuildRes?.detail || "Leaderboard cache successfully rebuilt from scratch!"}`, "success");
      
      addLog("Results and predictions sync finished successfully!", "success");
    } catch (error) {
      console.error(error);
      addLog(`Error during results sync: ${error.response?.data?.detail || error.message || "Network Error"}`, "error");
    } finally {
      setActiveAction(null);
    }
  };

  // 3. Maintenance autofill predictions
  const runAutofill = async () => {
    setActiveAction("autofill");
    addLog("Initiating auto-fill for missing prediction slots...", "info");
    try {
      const res = await autofillPredictionsAPI(id);
      addLog(`Autofill complete: generated default entries for ${res.filled} blank prediction slots.`, "success");
    } catch (error) {
      addLog(`Error auto-filling predictions: ${error.message || "Network Error"}`, "error");
    } finally {
      setActiveAction(null);
    }
  };

  // 4. Maintenance force finalize predictions
  const runForceFinalize = async () => {
    setActiveAction("force_finalize");
    addLog("Running force finalize of predictions...", "info");
    try {
      const count = await finalizePredictions(id);
      addLog(`Grader run finished: parsed and evaluated ${count} predictions.`, "success");
    } catch (error) {
      addLog(`Error finalising predictions: ${error.message || "Network Error"}`, "error");
    } finally {
      setActiveAction(null);
    }
  };

  // 5. Maintenance force rebuild leaderboard cache
  const runForceRebuild = async () => {
    setActiveAction("force_rebuild");
    addLog("Requesting full recalculation and leaderboard cache rebuild...", "info");
    try {
      const res = await rebuildEntireLeaderboard(id);
      addLog(`Rebuild complete: ${res?.detail || "Leaderboard cache successfully rebuilt!"}`, "success");
    } catch (error) {
      addLog(`Error rebuilding cache: ${error.message || "Network Error"}`, "error");
    } finally {
      setActiveAction(null);
    }
  };

  // 6. Danger zone destructive reset
  const runDestructiveReset = async () => {
    if (!confirmDestructiveReset) {
      addLog("Reset aborted: Please check the confirmation checkbox first.", "warning");
      return;
    }
    setActiveAction("destructive_reset");
    addLog("WARNING: Running destructive structure initialization...", "warning");
    try {
      addLog("Wiping and re-initializing weeks...", "info");
      const weeksRes = await initializeWeeksAPI(id);
      addLog(`Weeks table cleared and re-created. Created: ${weeksRes.initialized} weeks.`, "success");
      
      addLog("Wiping and re-initializing matches...", "info");
      const matchesRes = await initializeLeague(id);
      addLog(`Matches table cleared and re-created. Created: ${matchesRes.initialized || matchesRes} matches.`, "success");
      
      addLog("Wipeout and full reload complete!", "success");
      setConfirmDestructiveReset(false);
      refreshLinks();
    } catch (error) {
      addLog(`Error during destructive reset: ${error.message || "Network Error"}`, "error");
    } finally {
      setActiveAction(null);
    }
  };

  const isAnyActionRunning = activeAction !== null;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <AdminNav leagueName={league ? `${league.name} (${league.start_year})` : ""} />

      {/* Primary Sync Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        
        {/* Sync Structure Card */}
        <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Database className="w-5 h-5" />
              <CardTitle className="text-base font-bold">1. Sync Structure</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground min-h-[32px]">
              Sync new weeks and fixtures from the Mackolik targets. Non-destructive: preserves existing predictions, user lists, and scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold"
              onClick={runSyncStructure}
              disabled={isAnyActionRunning}
            >
              {activeAction === "sync_structure" ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FolderSync className="w-4 h-4" />
              )}
              <span>Sync Structure (Delta)</span>
            </Button>
          </CardContent>
        </Card>

        {/* Sync Scores & Predictions Card */}
        <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <RefreshCw className={cn("w-5 h-5", activeAction === "sync_results" && "animate-spin")} />
              <CardTitle className="text-base font-bold">2. Sync Scores & Points</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground min-h-[32px]">
              Fetches all scores from Mackolik, evaluates prediction outcomes, updates points, and rebuilds the leaderboard cache snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-10 text-xs font-semibold border-none"
              onClick={runSyncResults}
              disabled={isAnyActionRunning}
            >
              {activeAction === "sync_results" ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>Sync Results & Leaderboard</span>
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Terminal logs monitor */}
      <Card className="border border-slate-800 bg-slate-950 text-slate-100 shadow-lg mb-6 overflow-hidden">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="font-mono text-[11px] font-bold text-slate-300">Activity Monitor Console</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] h-6 px-2 hover:bg-slate-800 hover:text-white text-slate-400 font-semibold"
            onClick={clearConsole}
          >
            Clear Console
          </Button>
        </div>
        <div className="p-4 font-mono text-[11px] min-h-[140px] max-h-[220px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">No sync tasks initiated. Use the actions above to run sync operations.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-2 items-start leading-5 select-text">
                <span className="text-slate-500 flex-shrink-0">[{log.time}]</span>
                <span className={cn(
                  log.type === "success" && "text-green-400 font-bold",
                  log.type === "warning" && "text-amber-400 font-bold",
                  log.type === "error" && "text-red-400 font-bold animate-pulse",
                  log.type === "info" && "text-slate-200"
                )}>
                  {log.type === "success" && "✓ "}
                  {log.type === "error" && "✗ "}
                  {log.type === "warning" && "⚠ "}
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Structured Configuration Container Dashboard Card */}
      <Card className="w-full border border-border bg-card text-card-foreground shadow-sm mb-6">
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
                <span>Scraping Sources Configuration ({links.length})</span>
                <span className="text-muted-foreground font-mono">+/- Toggle</span>
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
                            onClick={() => {
                              navigator.clipboard.writeText(link.link);
                              addLog(`Copied stream ID: ${link.link}`, "info");
                            }}
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
                      Please input the tracking identifiers and target competition names.
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

      {/* Advanced Maintenance and Debug Zone */}
      <Card className="border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-4 py-4 h-12 font-bold text-xs hover:bg-muted/60 rounded-none transition-colors text-slate-800"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                <span>Advanced Maintenance & Debug Tools</span>
              </div>
              <span className="text-muted-foreground font-mono">+/- Toggle</span>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="p-5 border-t border-border bg-slate-50/50 flex flex-col gap-6">
            
            {/* Grid of helper utilities */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Maintenance Utilities</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-start gap-2 h-9 text-[11px] px-3 bg-white text-slate-700 border-border hover:bg-slate-100 hover:text-slate-900"
                  onClick={runAutofill}
                  disabled={isAnyActionRunning}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Auto-fill predictions</span>
                </Button>

                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-start gap-2 h-9 text-[11px] px-3 bg-white text-slate-700 border-border hover:bg-slate-100 hover:text-slate-900"
                  onClick={runForceFinalize}
                  disabled={isAnyActionRunning}
                >
                  <Award className="w-3.5 h-3.5 text-green-500" />
                  <span>Force Grading</span>
                </Button>

                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-start gap-2 h-9 text-[11px] px-3 bg-white text-slate-700 border-border hover:bg-slate-100 hover:text-slate-900"
                  onClick={runForceRebuild}
                  disabled={isAnyActionRunning}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                  <span>Rebuild Snapshots</span>
                </Button>

              </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 bg-red-50/50 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-wider">Danger Zone</h4>
                  <p className="text-[11px] text-red-700 leading-normal mt-0.5">
                    Dropping/clearing tournament structure data is permanent. Running a destructive reset deletes all existing matching weeks, fixtures, predictions, and accumulated scores for this league.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-red-100">
                <label className="flex items-center gap-2.5 text-xs text-red-900 select-none cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={confirmDestructiveReset}
                    onChange={(e) => setConfirmDestructiveReset(e.target.value === "on" || e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300 cursor-pointer"
                  />
                  <span className="font-medium">Confirm destructive database wipe</span>
                </label>

                <Button 
                  variant="destructive"
                  size="sm"
                  className="h-8 text-[11px] px-4 font-bold bg-red-600 hover:bg-red-700 text-white border-none flex items-center justify-center gap-2"
                  onClick={runDestructiveReset}
                  disabled={!confirmDestructiveReset || isAnyActionRunning}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Run Destructive Reset</span>
                </Button>
              </div>
            </div>

          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}

export default ScrapingOverview;
