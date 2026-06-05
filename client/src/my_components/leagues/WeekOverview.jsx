import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Item, ItemTitle } from "@/components/ui/item";
import { getLinks } from "@/services/api";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../common/Header";
import { cn } from "@/lib/utils";

function WeekOverview() {
  const { id } = useParams();
  useEffect(() => {
    getLinks(id)
      .then(setLinkList)
      .catch((err) => console.error(err));
  }, [id]);

  const [linkList, setLinkList] = useState([]);

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 items-center mb-4">
        <Link
          to="./.."
          className="justify-self-start text-blue-500 hover:underline"
        >
          &larr; Back
        </Link>
        <Header
          className="col-start-2 justify-self-center"
          title={"Admin Panel"}
        />
      </div>
      <div className="flex flex-col">
        {/* Outer loop for the individual links (competitions) */}
        {linkList.map((link) => (
          <Collapsible key={link.id}>
            <CollapsibleTrigger asChild>
              <Item variant="outline" className={"cursor-pointer"}>
                <ItemTitle className={"text-lg"}>{link.alias} </ItemTitle>
              </Item>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 bg-muted/20 border-x border-b rounded-b-md">
              {/* Second loop for weeks */}
              {link.weeks.map((week) => (
                <Collapsible key={week.id}>
                  <CollapsibleTrigger asChild>
                    <Item variant="outline" className={"cursor-pointer"}>
                      <ItemTitle className={"text-lg"}>
                        Week {week.week_num}{" "}
                        <span className="text-xs text-gray-400">
                          ({week.date})
                        </span>
                      </ItemTitle>
                    </Item>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-2 bg-muted/20 border-x border-b rounded-b-md">
                    {/* Loop for the matches in the weeks */}
                    {week.matches.map((match) => (
                      <MatchResultRow match={match}></MatchResultRow>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

function MatchResultRow({ match }) {
  return (
    <div key={match.id} className="grid grid-cols-3 divide-y py-1 items-center">
      <span>{match.home_team}</span>
      <div
        className={cn(
          "font-bold flex justify-center gap-2",
          match.status == "live" && "text-red-600",
        )}
      >
        <span>{match.home_score ?? "N/A"}</span>
        <span>-</span>
        <span>{match.away_score ?? "N/A"}</span>
      </div>
      <span className="justify-self-end">{match.away_team}</span>
    </div>
  );
}

export default WeekOverview;
