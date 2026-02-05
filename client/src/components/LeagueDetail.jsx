import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLinks, getLeague } from "../services/api";
import Header from "./Header";
import CsvUploader from "./CsvUploader";

function LeagueDetail() {
  const { id } = useParams();
  const [links, setLinks] = useState([]);
  const [league, setLeague] = useState({});

  useEffect(() => {
    getLinks(id)
      .then(setLinks)
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    getLeague(id)
      .then(setLeague)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 items-center mb-4">
        <Link
          to="/"
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
        <CsvUploader />
      </div>

      <div className="mt-8 border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Scraping Sources</h3>
          {/* You could add an "Add Link" button here later */}
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          {links.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm italic">
              No links configured yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between p-3 hover:bg-white transition duration-150"
                >
                  {/* Left: Icon & URL */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Generic Globe Icon */}
                    <span className="text-gray-400 flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m-15.686 0A11.953 11.953 0 0112 10.5c2.998 0 5.74-1.1 7.843-2.918m-15.686 0A8.959 8.959 0 013 12c0 .778.099 1.533.284 2.253"
                        />
                      </svg>
                    </span>

                    {/* The Link: Clickable & Truncated */}
                    <a
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium truncate max-w-md block"
                      title={link.link}
                    >
                      {link.link}
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {link.type && (
                      <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">
                        {link.type}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(link.link)}
                    className="text-xs text-gray-500 hover:text-blue-600 border px-2 py-1 rounded bg-white hover:bg-blue-50 transition"
                  >
                    Copy
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeagueDetail;
