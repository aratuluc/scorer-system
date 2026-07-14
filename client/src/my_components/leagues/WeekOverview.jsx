import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getLinks, getLeague } from "@/services/api";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminNav from "../common/AdminNav";
import { cn } from "@/lib/utils";

function WeekOverview() {
  const { id } = useParams();
  const [linkList, setLinkList] = useState([]);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [linksRes, leagueRes] = await Promise.all([
          getLinks(id),
          getLeague(id)
        ]);
        setLinkList(linksRes);
        setLeague(leagueRes);
      } catch (err) {
        console.error("Error fetching week overview data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto flex flex-col justify-center items-center h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground mt-4 font-semibold font-mono">Loading weeks and matches...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <AdminNav leagueName={league ? `${league.name} (${league.start_year})` : ""} />
      
      <div className="flex flex-col gap-4">
        {linkList.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-border text-muted-foreground text-sm shadow-sm">
            No competitions synced yet. Please configure scraping sources and run sync on the scraping page.
          </div>
        ) : (
          linkList.map((link) => (
            <div key={link.id} className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex justify-between items-center px-5 py-4 font-bold text-sm bg-muted/20 hover:bg-muted/40 transition-colors border-b border-border">
                    <span className="text-base text-foreground font-extrabold">{link.alias || link.link}</span>
                    <span className="text-xs text-muted-foreground font-mono">+/- Toggle</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 flex flex-col gap-3 bg-white">
                  {link.weeks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2">No weeks initialized yet.</p>
                  ) : (
                    link.weeks.map((week) => (
                      <Collapsible key={week.id} className="border border-border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex justify-between items-center px-4 py-2.5 text-xs font-semibold bg-muted/10 hover:bg-muted/30 transition-colors">
                            <span className="text-foreground">Week {week.week_num}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({week.date || "No date"})</span>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-3 bg-muted/5 border-t border-border flex flex-col gap-1.5">
                          {week.matches.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic text-center py-2">No matches in this week.</p>
                          ) : (
                            week.matches.map((match) => (
                              <MatchResultRow key={match.id} match={match} />
                            ))
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MatchResultRow({ match }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "FT" || match.status === "Finished";
  
  return (
    <div className="grid grid-cols-7 py-2 px-3 items-center text-xs hover:bg-muted/30 rounded transition-colors border-b border-muted/50 last:border-b-0">
      <span className="col-span-3 text-right font-medium pr-3 truncate" title={match.home_team}>
        {match.home_team}
      </span>
      
      <div className="col-span-1 flex flex-col items-center justify-center">
        <div
          className={cn(
            "font-extrabold text-xs px-2 py-0.5 rounded-md min-w-[50px] text-center font-mono border",
            isLive
              ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
              : isFinished
              ? "bg-slate-100 text-slate-800 border-slate-200"
              : "bg-muted/20 text-muted-foreground border-border"
          )}
        >
          {match.home_score !== null && match.away_score !== null
            ? `${match.home_score} - ${match.away_score}`
            : "vs"}
        </div>
        {match.status && (
          <span className={cn(
            "text-[9px] uppercase font-bold mt-1 tracking-wider font-mono",
            isLive ? "text-red-500" : "text-muted-foreground"
          )}>
            {match.status}
          </span>
        )}
      </div>
      
      <span className="col-span-3 text-left font-medium pl-3 truncate" title={match.away_team}>
        {match.away_team}
      </span>
    </div>
  );
}

export default WeekOverview;
