import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getLinks,
  getLeague,
  addLink,
  deleteLink,
  initializeLeague,
  finalizePredictions,
} from "../../services/api";
import Header from "../common/Header";
import Accordion from "../common/Accordion";
import SingleModal from "../common/SingleModal";
import ControlButton from "../common/ControlButton";
import InfoPanel from "../common/InfoPanel";

function ScrapingOverview() {
  const { id } = useParams();
  const [links, setLinks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState("");
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

  const onSave = async (string) => {
    await addLink(id, { link: string });
    refreshLinks();
  };

  const handleDelete = async (link_id) => {
    await deleteLink(link_id, id);
    refreshLinks();
  };

  const onInitialize = async () => {
    // 1. Lock the UI
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

  return (
    <div className="mt-8 border-t pt-4">
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
      {statusText && (
        <InfoPanel
          onDismiss={() => setCurrentStatusText(null)}
          status={panelStatus}
        >
          {statusText}
        </InfoPanel>
      )}
      <div className="border-t pt-4 mt-8">
        <div className="mb-4 flex gap-4">
          <ControlButton
            text={"Initialize"}
            icon={"🔄"}
            disabled={loadingAction !== null}
            onClick={onInitialize}
          />
          <ControlButton
            text={"Finalize Predictions"}
            icon={"✳️"}
            disabled={loadingAction !== null}
            onClick={onFinalize}
          />
        </div>
        <Accordion title={"Sources"}>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(link.link)}
                        className="text-xs text-gray-500 hover:text-blue-600 border px-2 py-1 rounded bg-white hover:bg-blue-50 transition"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="text-xs text-red-500 hover:text-red-600 border px-2 py-1 rounded bg-red-100 hover:bg-red-300 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(!isModalOpen)}
            className="flex items-center justify-center border border-green-600 rounded shadow bg-green-200 p-2 mt-2 h-8"
          >
            +
          </button>
        </Accordion>
      </div>
      <SingleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentLink ? "Edit Link" : "Add Link"}
        onSave={onSave}
        value={currentLink}
      />
    </div>
  );
}

export default ScrapingOverview;
