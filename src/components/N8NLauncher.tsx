import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDockerStatus } from "@/hooks/useDockerStatus";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
	Activity,
	Container,
	FileText,
	Play,
	RefreshCw,
	Square,
	Bug,
} from "lucide-react";
import { useState } from "react";
import { DockerInstallGuide } from "./DockerInstallGuide";
import { StateController } from "./StateController";
import { StatusIndicator } from "./StatusIndicator";

export function N8NLauncher() {
	const {
		status,
		loading,
		simulationMode,
		checkDockerStatus,
		startN8N,
		stopN8N,
		getLogs,
		getDebugPaths,
		setManualState,
		setManualLoading,
		toggleSimulation,
	} = useDockerStatus();
	const [showLogs, setShowLogs] = useState(false);
	const [logs, setLogs] = useState<string>("");
	const [logsLoading, setLogsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [showDebugInfo, setShowDebugInfo] = useState(false);
	const [debugInfo, setDebugInfo] = useState<string>("");

	const refreshLogs = async () => {
		try {
			const dockerLogs = await getLogs();
			setLogs(dockerLogs);
		} catch (error) {
			console.log("Could not refresh logs:", error);
		}
	};

	const handleStartN8N = async () => {
		if (status.docker !== "running") {
			return;
		}

		setErrorMessage(""); // Clear any previous errors
		try {
			// If logs are visible, pass refresh callback
			const logsRefreshCallback = showLogs ? refreshLogs : undefined;
			await startN8N(logsRefreshCallback);
		} catch (error) {
			console.error("Failed to start N8N:", error);
			setErrorMessage(error instanceof Error ? error.message : String(error));
		}
	};

	const handleStopN8N = async () => {
		setErrorMessage(""); // Clear any previous errors
		try {
			// If logs are visible, pass refresh callback
			const logsRefreshCallback = showLogs ? refreshLogs : undefined;
			await stopN8N(logsRefreshCallback);
		} catch (error) {
			console.error("Failed to stop N8N:", error);
			setErrorMessage(error instanceof Error ? error.message : String(error));
		}
	};

	const handleViewLogs = async () => {
		if (!showLogs) {
			setLogsLoading(true);
			try {
				await refreshLogs();
			} catch (error) {
				console.error("Failed to get logs:", error);
				const errorMsg = error instanceof Error ? error.message : "Failed to load logs. Make sure Docker Compose is running.";
				setLogs(errorMsg);
			} finally {
				setLogsLoading(false);
			}
		}
		setShowLogs(!showLogs);
	};

	const handleDebugPaths = async () => {
		if (!showDebugInfo) {
			try {
				const paths = await getDebugPaths();
				setDebugInfo(paths);
			} catch (error) {
				console.error("Failed to get debug paths:", error);
				const errorMsg = error instanceof Error ? error.message : "Failed to get debug info";
				setDebugInfo(errorMsg);
			}
		}
		setShowDebugInfo(!showDebugInfo);
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
		<>
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
			<div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
				<div className="w-full max-w-sm space-y-6">
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
						<Card className="bg-gradient-card border-border/50">
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
						<Card className="bg-gradient-card border-border/50">
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
					<Card className="bg-gradient-card border-border/50">
						<CardContent className="p-6 space-y-4">
							<h2 className="text-lg font-semibold text-foreground mb-4">
								Controls
							</h2>

							<div className="space-y-3">
								{getMainActionButton()}

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

								<Button
									variant="outline"
									size="lg"
									className="w-full"
									onClick={handleDebugPaths}
								>
									<Bug className="mr-2 h-5 w-5" />
									{showDebugInfo ? "Hide Debug Info" : "Debug Paths"}
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Info */}
					{status.n8n === "running" && (
						<Card className="bg-gradient-card border-border/50">
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
					)}

					{/* Logs Preview */}
					{showLogs && (
						<Card className="bg-gradient-card border-border/50">
							<CardContent className="p-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-sm font-semibold text-foreground">
										Docker Logs
									</h3>
									<Button
										variant="ghost"
										size="sm"
										onClick={async () => {
											setLogsLoading(true);
											try {
												await refreshLogs();
											} catch (error) {
												console.error("Failed to refresh logs:", error);
												const errorMsg = error instanceof Error ? error.message : "Failed to load logs. Make sure Docker Compose is running.";
												setLogs(errorMsg);
											} finally {
												setLogsLoading(false);
											}
										}}
										disabled={logsLoading}
										className="h-7 px-2 text-xs"
									>
										<RefreshCw
											className={`h-3 w-3 ${logsLoading ? "animate-spin" : ""}`}
										/>
									</Button>
								</div>
								<div className="bg-black/20 rounded-lg p-4 font-mono text-xs max-h-60 overflow-y-auto">
									{logsLoading ? (
										<div className="text-muted-foreground">Loading logs...</div>
									) : logs ? (
										<pre className="whitespace-pre-wrap text-muted-foreground">
											{logs}
										</pre>
									) : (
										<div className="text-muted-foreground">
											No logs available
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Debug Info */}
					{showDebugInfo && (
						<Card className="bg-gradient-card border-border/50">
							<CardContent className="p-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-sm font-semibold text-foreground">
										Debug Information
									</h3>
								</div>
								<div className="bg-black/20 rounded-lg p-4 font-mono text-xs max-h-60 overflow-y-auto">
									{debugInfo ? (
										<pre className="whitespace-pre-wrap text-muted-foreground">
											{debugInfo}
										</pre>
									) : (
										<div className="text-muted-foreground">
											No debug info available
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</>
	);
}
