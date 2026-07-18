import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getCustomBets,
  getLeague,
  getPlayers,
  createCustomBet,
  updateCustomBet,
  deleteCustomBet,
  uploadCustomBetsCSV,
} from "../../services/api";
import AdminNav from "../common/AdminNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Award, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Trophy, 
  Info,
  CheckCircle2,
  Upload,
  FileSpreadsheet
} from "lucide-react";

function CustomBetsOverview() {
  const { id } = useParams();
  const [league, setLeague] = useState(null);
  const [players, setPlayers] = useState([]);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newResult, setNewResult] = useState("");
  
  const [editingBet, setEditingBet] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedResult, setEditedResult] = useState("");
  const [predForm, setPredForm] = useState([]); // Array of { player_id, prediction, points }

  // CSV Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const [message, setMessage] = useState(null); // { text, type }

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leagueRes, playersRes, betsRes] = await Promise.all([
        getLeague(id),
        getPlayers(id),
        getCustomBets(id),
      ]);
      setLeague(leagueRes);
      setPlayers(playersRes);
      setBets(betsRes);
    } catch (error) {
      console.error(error);
      showMessage("Error fetching data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddBet = async () => {
    if (!newTitle.trim()) {
      showMessage("Bet Title is required", "error");
      return;
    }
    try {
      await createCustomBet(id, {
        title: newTitle.trim(),
        result: newResult.trim() || null,
      });
      setIsAddOpen(false);
      setNewTitle("");
      setNewResult("");
      showMessage("Season bet created successfully!");
      fetchData();
    } catch (error) {
      showMessage("Failed to create season bet.", "error");
    }
  };

  const openEditModal = (bet) => {
    setEditingBet(bet);
    setEditedTitle(bet.title);
    setEditedResult(bet.result || "");
    
    // Map current predictions or initialize blank ones for all players
    const form = players.map((player) => {
      const existing = Array.isArray(bet.predictions)
        ? bet.predictions.find((p) => p.player_id === player.id)
        : null;
      return {
        player_id: player.id,
        player_name: player.name,
        prediction: existing?.prediction || "",
        points: existing?.points || 0,
      };
    });
    setPredForm(form);
    setIsEditOpen(true);
  };

  const handleSavePredictions = async () => {
    if (!editedTitle.trim()) {
      showMessage("Bet Title cannot be empty", "error");
      return;
    }
    try {
      const payload = {
        title: editedTitle.trim(),
        result: editedResult.trim() || null,
        predictions: predForm.map((item) => ({
          player_id: item.player_id,
          prediction: item.prediction.trim() || null,
          points: Number(item.points) || 0,
        })),
      };
      await updateCustomBet(id, editingBet.id, payload);
      setIsEditOpen(false);
      showMessage("Season bet and predictions saved successfully!");
      fetchData();
    } catch (error) {
      showMessage("Failed to save changes.", "error");
    }
  };

  const handleDeleteBet = async (betId) => {
    if (!window.confirm("Are you sure you want to delete this custom bet? This will wipe all player predictions and points for this bet.")) {
      return;
    }
    try {
      await deleteCustomBet(id, betId);
      showMessage("Season bet deleted successfully.", "warning");
      fetchData();
    } catch (error) {
      showMessage("Failed to delete season bet.", "error");
    }
  };

  const handlePredChange = (playerId, field, value) => {
    setPredForm((prev) =>
      prev.map((item) =>
        item.player_id === playerId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUploadCSV = async () => {
    if (!uploadFile) {
      showMessage("Please select a CSV file first.", "error");
      return;
    }
    try {
      setUploading(true);
      setUploadResult(null);
      const res = await uploadCustomBetsCSV(id, uploadFile);
      setUploadResult(res);
      showMessage(`CSV processed successfully! Imported ${res.bets_count} bets and synced choices for ${res.matched_players} players.`);
      fetchData();
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || "Failed to process CSV file. Make sure column headers and name fields are correct.";
      showMessage(errMsg, "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto flex flex-col justify-center items-center h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground mt-4 font-semibold font-mono">Loading Season Bets...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <AdminNav leagueName={league ? `${league.name} (${league.start_year})` : ""} />

      {message && (
        <div className={`p-4 mb-4 rounded-xl border flex items-start gap-2.5 shadow-sm text-xs font-semibold animate-fade-in ${
          message.type === 'error' 
            ? 'bg-red-50 text-red-800 border-red-200' 
            : message.type === 'warning'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-green-50 text-green-800 border-green-200'
        }`}>
          {message.type === 'error' ? <Info className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main card */}
      <Card className="border border-border bg-card shadow-sm mb-6">
        <CardHeader className="flex flex-row justify-between items-center pb-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Season Bets & Predictions</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Define custom overall season predictions (e.g. champions, top scorers) and award manual points to players.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="flex items-center gap-1.5 h-8 text-xs font-semibold"
              onClick={() => {
                setUploadFile(null);
                setUploadResult(null);
                setIsUploadOpen(true);
              }}
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import CSV</span>
            </Button>
            <Button 
              className="flex items-center gap-1.5 h-8 text-xs font-semibold"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bet</span>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-2">
          {bets.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground text-xs italic bg-slate-50/50">
              No season bets added yet. Click "Add Bet" or "Import CSV" to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <th className="py-3 px-4">Bet Title</th>
                    <th className="py-3 px-4">Actual Result</th>
                    <th className="py-3 px-4">Submissions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {bets.map((bet) => {
                    const submissionsCount = bet.predictions.filter(p => p.prediction).length;
                    return (
                      <tr key={bet.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{bet.title}</td>
                        <td className="py-3 px-4">
                          {bet.result ? (
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 font-semibold border border-green-200 rounded">
                              {bet.result}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">TBD</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          {submissionsCount} / {players.length} players
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-medium px-2.5 flex items-center gap-1"
                            onClick={() => openEditModal(bet)}
                          >
                            <Edit3 className="w-3 h-3 text-slate-500" />
                            <span>Edit Predictions</span>
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 text-xs font-medium px-2.5 flex items-center gap-1"
                            onClick={() => handleDeleteBet(bet.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bet Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Create New Season Bet</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a new custom bet topic that players will get points for.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground font-semibold">Bet Title</label>
              <input
                type="text"
                placeholder="e.g. World Cup Champion or League Top Goalscorer"
                className="bg-background text-foreground border border-border p-2 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-ring"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground font-semibold">Actual Result (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank if undecided, e.g. Spain"
                className="bg-background text-foreground border border-border p-2 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-ring"
                value={newResult}
                onChange={(e) => setNewResult(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleAddBet}>
                Save Bet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Import Season Bets from Google Forms / CSV</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload a CSV file containing player entries. The CSV should contain a player name column (e.g. 'İsim:' or 'Name'). Each other column will be mapped to a season bet category automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-2">
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input 
                type="file" 
                accept=".csv" 
                id="season-csv-file-input" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <label htmlFor="season-csv-file-input" className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full text-center">
                <Upload className="w-8 h-8 text-indigo-500 animate-bounce" />
                <span className="text-xs font-semibold text-slate-700">
                  {uploadFile ? uploadFile.name : "Click to select CSV File"}
                </span>
                <span className="text-[10px] text-muted-foreground">CSV files only (UTF-8 supported)</span>
              </label>
            </div>

            {uploadResult && (
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs leading-normal text-indigo-900 flex flex-col gap-1.5">
                <p className="font-bold text-indigo-950">Import Complete:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-medium">
                  <li>Imported/Synced Bets: {uploadResult.bets_count}</li>
                  <li>Successfully Matched Players: {uploadResult.matched_players}</li>
                  <li>Created Predictions: {uploadResult.predictions_created}</li>
                  <li>Updated Predictions: {uploadResult.predictions_updated}</li>
                </ul>
                {uploadResult.unmatched_players.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-indigo-100/60">
                    <p className="font-bold text-amber-700 text-[10px] uppercase">Unmatched Names in CSV ({uploadResult.unmatched_players.length}):</p>
                    <p className="text-[10px] text-amber-800 italic mt-0.5 truncate max-w-full">
                      {uploadResult.unmatched_players.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsUploadOpen(false)} disabled={uploading}>
                Close
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none font-semibold flex items-center gap-1.5"
                onClick={handleUploadCSV}
                disabled={!uploadFile || uploading}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{uploading ? "Uploading..." : "Start Import"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Predictions Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl bg-background border border-border shadow-lg max-h-[85vh] overflow-y-auto p-6">
          <div className="flex flex-col gap-4">
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Submissions: {editingBet?.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record player choices and award manual points. Saving will trigger an overall leaderboard recalculation.
              </DialogDescription>
            </DialogHeader>

            {/* Bet Info Details */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-lg">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Bet Title</label>
                <input
                  type="text"
                  className="bg-white border p-2 rounded text-xs w-full font-semibold text-slate-800"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Actual Result</label>
                <input
                  type="text"
                  placeholder="e.g. Spain"
                  className="bg-white border p-2 rounded text-xs w-full font-semibold text-slate-800"
                  value={editedResult}
                  onChange={(e) => setEditedResult(e.target.value)}
                />
              </div>
            </div>

            {/* Players Table List */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Prediction</th>
                    <th className="py-2.5 px-3 w-[100px]">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {predForm.map((row) => (
                    <tr key={`form-row-${row.player_id}`} className="hover:bg-slate-50/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{row.player_name}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="e.g. France"
                          className="bg-white border border-border p-1.5 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-ring"
                          value={row.prediction}
                          onChange={(e) => handlePredChange(row.player_id, "prediction", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          className="bg-white border border-border p-1.5 rounded text-xs w-full font-mono text-center focus:outline-none focus:ring-1 focus:ring-ring font-bold text-blue-600"
                          value={row.points}
                          onChange={(e) => handlePredChange(row.player_id, "points", e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="flex items-center gap-1.5 px-4 font-semibold"
                onClick={handleSavePredictions}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Predictions</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomBetsOverview;
