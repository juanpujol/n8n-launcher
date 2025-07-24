import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDockerStatus } from "@/hooks/useDockerStatus";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Activity,
  Container,
  FileText,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DockerInstallGuide } from "./DockerInstallGuide";
import { LogsCard } from "./LogsCard";
import { StateController } from "./StateController";
import { StatusIndicator } from "./StatusIndicator";

// Animated wrapper component
const AnimatedCard = ({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      // Show: render first, then animate in
      setShouldRender(true);
      // Small delay to ensure DOM is rendered before starting animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    }

    // Hide: animate out first, then remove from DOM
    setIsVisible(false);
    const timer = setTimeout(() => setShouldRender(false), 1000); // Match animation duration
    return () => clearTimeout(timer);
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div
      className={`transition-all duration-1000 ease-out overflow-hidden ${
        isVisible
          ? "max-h-[1000px] opacity-100 transform translate-y-0 mb-6"
          : "max-h-0 opacity-0 transform -translate-y-4 mb-0"
      }`}
    >
      {children}
    </div>
  );
};

export function N8NLauncher() {
  const {
    status,
    loading,
    simulationMode,
    checkDockerStatus,
    startN8NWithProgress,
    stopN8NWithProgress,
    getLogs,
    setManualState,
    setManualLoading,
    toggleSimulation,
  } = useDockerStatus();
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [stopProgressMessages, setStopProgressMessages] = useState<string[]>(
    []
  );
  const [showStopProgress, setShowStopProgress] = useState(false);



  const refreshLogs = async () => {
    try {
      const dockerLogs = await getLogs();
      setLogs(dockerLogs);
    } catch (error) {
      console.log("Could not refresh logs:", error);
    }
  };

  const handleRefreshLogs = async () => {
    setLogsLoading(true);
    try {
      await refreshLogs();
    } catch (error) {
      console.error("Failed to refresh logs:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to load logs. Make sure Docker Compose is running.";
      setLogs(errorMsg);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleStartN8N = async () => {
    if (status.docker !== "running") {
      return;
    }

    setErrorMessage(""); // Clear any previous errors
    setProgressMessages([]);
    setShowProgress(true);

    try {
      // Progress callback to collect messages
      const onProgress = (message: string) => {
        setProgressMessages((prev) => [...prev, message]);
      };

      // If logs are visible, pass refresh callback
      const logsRefreshCallback = showLogs ? refreshLogs : undefined;

      await startN8NWithProgress(onProgress, logsRefreshCallback);

      // Hide progress after successful completion
      setTimeout(() => {
        setShowProgress(false);
        setProgressMessages([]);
      }, 3000);
    } catch (error) {
      console.error("Failed to start N8N:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setShowProgress(false);
    }
  };

  const handleStopN8N = async () => {
    setErrorMessage(""); // Clear any previous errors
    setStopProgressMessages([]);
    setShowStopProgress(true);

    try {
      // Progress callback to collect stop messages
      const onProgress = (message: string) => {
        setStopProgressMessages((prev) => [...prev, message]);
      };

      // If logs are visible, pass refresh callback
      const logsRefreshCallback = showLogs ? refreshLogs : undefined;

      await stopN8NWithProgress(onProgress, logsRefreshCallback);

      // Hide progress after successful completion
      setTimeout(() => {
        setShowStopProgress(false);
        setStopProgressMessages([]);
      }, 3000);
    } catch (error) {
      console.error("Failed to stop N8N:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setShowStopProgress(false);
    }
  };

  const handleViewLogs = async () => {
    if (!showLogs) {
      setLogsLoading(true);
      try {
        await refreshLogs();
      } catch (error) {
        console.error("Failed to get logs:", error);
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Failed to load logs. Make sure Docker Compose is running.";
        setLogs(errorMsg);
      } finally {
        setLogsLoading(false);
      }
    }
    setShowLogs(!showLogs);
  };

  const getMainActionButton = () => {
    if (status.docker !== "running") {
      return (
        <Button
          variant="outline"
          size="lg"
          className="w-full opacity-50 cursor-not-allowed"
          disabled
        >
          <Container className="mr-2 h-5 w-5" />
          Docker Required
        </Button>
      );
    }

    if (status.n8n === "running") {
      return (
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          onClick={handleStopN8N}
          disabled={loading}
        >
          <Square className="mr-2 h-5 w-5" />
          Stop N8N
        </Button>
      );
    }

    return (
      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={handleStartN8N}
        disabled={loading}
      >
        <Play className="mr-2 h-5 w-5" />
        Start N8N
      </Button>
    );
  };

  return (
    <div className="h-screen bg-gradient-background overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex items-center justify-center p-4 min-h-full">
          {/* Show debug controls only in development */}
          {import.meta.env.DEV && (
            <StateController
              onStateChange={setManualState}
              onLoadingChange={setManualLoading}
              onSimulationToggle={toggleSimulation}
              currentStates={status}
              loading={loading}
              simulationEnabled={simulationMode}
            />
          )}
          <div className="w-full max-w-sm min-w-0 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <h1 className="text-2xl font-bold text-muted-foreground">
                  N8N Launcher
                </h1>
              </div>
            </div>

            {/* Docker Installation Guide or System Status */}
            {status.docker === "not-found" ? (
              <DockerInstallGuide />
            ) : loading && status.docker === "unknown" ? (
              <Card className="bg-gradient-card border-border/50 w-full min-w-0">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span className="text-muted-foreground">
                      Checking Docker status...
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-card border-border/50 w-full min-w-0">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      System Status
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => checkDockerStatus()}
                      disabled={loading}
                      className="h-8 w-8"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>

                  <StatusIndicator
                    status={status.docker}
                    label="Docker"
                    className="bg-card/20"
                  />
                  <StatusIndicator
                    status={status.n8n}
                    label="N8N Service"
                    className="bg-card/20"
                  />

                  {/* Show error message if present */}
                  {errorMessage && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400">{errorMessage}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <Card className="bg-gradient-card border-border/50 w-full min-w-0">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  {getMainActionButton()}

                  {import.meta.env.DEV && (
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      onClick={handleViewLogs}
                      disabled={logsLoading}
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      {logsLoading
                        ? "Loading..."
                        : showLogs
                        ? "Hide Logs"
                        : "View Logs"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <AnimatedCard show={status.n8n === "running"}>
              <Card className="bg-gradient-card border-border/50 w-full min-w-0">
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      N8N is running on
                    </p>
                    <p className="text-primary font-mono text-lg">
                      localhost:5678
                    </p>
                    <Button
                      variant="link"
                      className="text-sm h-auto p-0"
                      onClick={async () => {
                        try {
                          await openUrl("http://localhost:5678");
                        } catch (error) {
                          console.error("Failed to open N8N interface:", error);
                        }
                      }}
                    >
                      Open N8N Interface →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Logs Preview */}
            {import.meta.env.DEV && (
              <LogsCard
                logs={logs}
                loading={logsLoading}
                visible={showLogs}
                title="Docker Logs"
                onRefresh={handleRefreshLogs}
                showRefreshButton={true}
              />
            )}

            {/* Start Progress Display */}
            <AnimatedCard show={showProgress}>
              <LogsCard
                logs={progressMessages}
                loading={loading}
                visible={true}
                title="Starting N8N..."
                showRefreshButton={false}
              />
            </AnimatedCard>

            {/* Stop Progress Display */}
            <AnimatedCard show={showStopProgress}>
              <LogsCard
                logs={stopProgressMessages}
                loading={loading}
                visible={true}
                title="Stopping N8N..."
                showRefreshButton={false}
              />
            </AnimatedCard>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
