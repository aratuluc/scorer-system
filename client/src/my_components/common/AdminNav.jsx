import { Link, useLocation, useParams } from "react-router-dom";
import { LayoutDashboard, Calendar, RefreshCw, ArrowLeft, Award } from "lucide-react";
import { cn } from "@/lib/utils";

function AdminNav({ leagueName }) {
  const { id } = useParams();
  const location = useLocation();

  const navItems = [
    {
      name: "Dashboard & Players",
      path: `/leagues/${id}`,
      icon: LayoutDashboard,
      active: location.pathname === `/leagues/${id}` || location.pathname === `/leagues/${id}/`,
    },
    {
      name: "Fixtures & Scores",
      path: `/leagues/${id}/weeks`,
      icon: Calendar,
      active: location.pathname.endsWith("/weeks"),
    },
    {
      name: "Scraping & Control",
      path: `/leagues/${id}/scrape`,
      icon: RefreshCw,
      active: location.pathname.endsWith("/scrape"),
    },
    {
      name: "Season Bets",
      path: `/leagues/${id}/custom-bets`,
      icon: Award,
      active: location.pathname.endsWith("/custom-bets"),
    },
  ];

  return (
    <div className="w-full bg-white border border-border rounded-xl shadow-sm mb-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Back Link and Title */}
        <div className="flex items-center gap-3">
          <Link
            to="/leagues"
            className="p-2 hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
            title="Back to leagues list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground font-mono">
              League Admin Console
            </span>
            <h1 className="text-xl font-extrabold text-foreground leading-tight">
              {leagueName || "Loading League..."}
            </h1>
          </div>
        </div>

        {/* Tab links */}
        <nav className="flex bg-muted/40 p-1 rounded-lg border border-border w-full sm:w-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold tracking-tight transition-all duration-200 w-full sm:w-auto",
                  item.active
                    ? "bg-white text-blue-600 shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-4 h-4", item.active ? "text-blue-600" : "text-muted-foreground")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default AdminNav;
