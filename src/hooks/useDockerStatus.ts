import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";

export type ServiceStatus = "running" | "stopped" | "unknown" | "not-found";

interface DockerStatus {
	docker: ServiceStatus;
	n8n: ServiceStatus;
}

interface TauriDockerStatus {
	installed: boolean;
	running: boolean;
	version?: string;
}

interface N8NStatusResult {
	running: boolean;
	containers_exist: boolean;
	images_available: boolean;
	error_message?: string;
}

export function useDockerStatus() {
	const [status, setStatus] = useState<DockerStatus>({
		docker: "unknown",
		n8n: "unknown",
	});
	const [loading, setLoading] = useState(true);
	const [simulationMode, setSimulationMode] = useState(false);

	const checkDockerStatus = useCallback(
		async (retryCount = 0) => {
			if (simulationMode) return;

			setLoading(true);

			try {
				// Call the real Tauri backend to check Docker status
				const dockerStatus = await invoke<TauriDockerStatus>(
					"check_docker_status",
				);

				// Convert Tauri status to our internal format
				const dockerService: ServiceStatus = !dockerStatus.installed
					? "not-found"
					: dockerStatus.running
						? "running"
						: "stopped";

				let n8nService: ServiceStatus = "unknown";

				if (dockerService === "running") {
					// Check actual N8N container status
					try {
						const n8nStatus = await invoke<N8NStatusResult>("check_n8n_status");
						
						if (n8nStatus.running) {
							n8nService = "running";
						} else if (n8nStatus.containers_exist || n8nStatus.images_available) {
							n8nService = "stopped";
						} else {
							n8nService = "unknown";
						}
					} catch (error) {
						console.error("Failed to check N8N status:", error);
						n8nService = "unknown";
					}
				} else {
					// If Docker isn't running, N8N can't be running either
					n8nService = dockerService === "not-found" ? "not-found" : "stopped";
				}

				setStatus({
					docker: dockerService,
					n8n: n8nService,
				});
			} catch (error) {
				console.error("Failed to check Docker status:", error);

				// Retry up to 2 times on initial load if we haven't retried yet
				if (retryCount < 2) {
					setTimeout(() => {
						checkDockerStatus(retryCount + 1);
					}, 1000);
					return;
				}

				// On error after retries, assume Docker is not found rather than unknown
				// This prevents showing the wrong UI when there are invoke issues
				setStatus({
					docker: "not-found",
					n8n: "not-found",
				});
			} finally {
				setLoading(false);
			}
		},
		[simulationMode],
	);

	const setManualState = (docker: ServiceStatus, n8n: ServiceStatus) => {
		if (simulationMode) {
			setStatus({ docker, n8n });
		}
	};

	const setManualLoading = (isLoading: boolean) => {
		if (simulationMode) {
			setLoading(isLoading);
		}
	};

	const toggleSimulation = (enabled: boolean) => {
		setSimulationMode(enabled);
		if (!enabled) {
			// When disabling simulation, immediately check real status
			checkDockerStatus();
		}
	};

	const startN8NWithProgress = async (onProgress?: (message: string) => void, onLogsRefresh?: () => Promise<void>) => {
		if (simulationMode) {
			// In simulation mode, just update the state
			setLoading(true);
			setTimeout(() => {
				setStatus((prev) => ({ ...prev, n8n: "running" }));
				setLoading(false);
			}, 1000);
			return;
		}

		setLoading(true);
		
		// Listen for progress events
		const unlisten = await listen<string>("docker-progress", (event) => {
			if (onProgress) {
				onProgress(event.payload);
			}
		});

		try {
			await invoke<string>("start_n8n_streaming");

			// Poll until N8N is actually available  
			let attempts = 0;
			const maxAttempts = 60; // Reduced since we have real-time feedback now

			while (attempts < maxAttempts) {
				try {
					const n8nStatus = await invoke<N8NStatusResult>("check_n8n_status");
					if (n8nStatus.running) {
						setStatus((prev) => ({ ...prev, n8n: "running" }));
						break;
					}
				} catch (statusError) {
					console.log("N8N not ready yet, retrying...");
				}

				// Refresh logs if callback provided
				if (onLogsRefresh && attempts % 3 === 0) {
					try {
						await onLogsRefresh();
					} catch (logError) {
						console.log("Could not refresh logs yet");
					}
				}

				attempts++;
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			// Final status check
			if (attempts >= maxAttempts) {
				console.warn("N8N start timeout, checking final status");
				try {
					const n8nStatus = await invoke<N8NStatusResult>("check_n8n_status");
					setStatus((prev) => ({
						...prev,
						n8n: n8nStatus.running ? "running" : (n8nStatus.containers_exist || n8nStatus.images_available) ? "stopped" : "unknown",
					}));
				} catch (statusError) {
					setStatus((prev) => ({ ...prev, n8n: "unknown" }));
				}
			}

			// Final logs refresh
			if (onLogsRefresh) {
				try {
					await onLogsRefresh();
				} catch (logError) {
					console.log("Could not do final logs refresh");
				}
			}
		} catch (error) {
			console.error("Failed to start N8N:", error);
			setStatus((prev) => ({ ...prev, n8n: "unknown" }));
			throw new Error(`Failed to start N8N: ${error}`);
		} finally {
			unlisten();
			setLoading(false);
		}
	};

	const startN8N = async (onLogsRefresh?: () => Promise<void>) => {
		if (simulationMode) {
			// In simulation mode, just update the state
			setLoading(true);
			setTimeout(() => {
				setStatus((prev) => ({ ...prev, n8n: "running" }));
				setLoading(false);
			}, 1000);
			return;
		}

		setLoading(true);
		try {
			await invoke<string>("start_n8n");

			// Poll until N8N is actually available  
			let attempts = 0;
			const maxAttempts = 120; // 120 seconds max (increased for image downloads)

			while (attempts < maxAttempts) {
				try {
					const n8nStatus = await invoke<N8NStatusResult>("check_n8n_status");
					if (n8nStatus.running) {
						setStatus((prev) => ({ ...prev, n8n: "running" }));
						break;
					}
				} catch (statusError) {
					console.log("N8N not ready yet, retrying...");
				}

				// Refresh logs more frequently during startup if callback provided
				if (onLogsRefresh && attempts % 2 === 0) {
					try {
						await onLogsRefresh();
					} catch (logError) {
						console.log("Could not refresh logs yet");
					}
				}

				attempts++;
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
			}

			// Final status check
			if (attempts >= maxAttempts) {
				console.warn("N8N start timeout, checking final status");
				try {
					const n8nStatus = await invoke<N8NStatusResult>("check_n8n_status");
					setStatus((prev) => ({
						...prev,
						n8n: n8nStatus.running ? "running" : (n8nStatus.containers_exist || n8nStatus.images_available) ? "stopped" : "unknown",
					}));
				} catch (statusError) {
					setStatus((prev) => ({ ...prev, n8n: "unknown" }));
				}
			}

			// Final logs refresh
			if (onLogsRefresh) {
				try {
					await onLogsRefresh();
				} catch (logError) {
					console.log("Could not do final logs refresh");
				}
			}
		} catch (error) {
			console.error("Failed to start N8N:", error);
			setStatus((prev) => ({ ...prev, n8n: "unknown" }));
			// Re-throw with more context
			throw new Error(`Failed to start N8N: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	const stopN8N = async (onLogsRefresh?: () => Promise<void>) => {
		if (simulationMode) {
			// In simulation mode, just update the state
			setLoading(true);
			setTimeout(() => {
				setStatus((prev) => ({ ...prev, n8n: "stopped" }));
				setLoading(false);
			}, 800);
			return;
		}

		setLoading(true);
		try {
			await invoke<string>("stop_n8n");

			// Poll until N8N is actually stopped
			let attempts = 0;
			const maxAttempts = 15; // 15 seconds max for shutdown

			while (attempts < maxAttempts) {
				try {
					const n8nStatus = await invoke<N8NStatusResult>("check_n8n_status");
					if (!n8nStatus.running) {
						setStatus((prev) => ({ ...prev, n8n: "stopped" }));
						break;
					}
				} catch (statusError) {
					// If we can't check status, assume it's stopped
					setStatus((prev) => ({ ...prev, n8n: "stopped" }));
					break;
				}

				// Refresh logs every few attempts if callback provided
				if (onLogsRefresh && attempts % 2 === 0) {
					try {
						await onLogsRefresh();
					} catch (logError) {
						console.log("Could not refresh logs during stop");
					}
				}

				attempts++;
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
			}

			// Final status check
			if (attempts >= maxAttempts) {
				console.warn("N8N stop timeout, checking final status");
				try {
					const n8nStatus = await invoke<N8NStatusResult>("check_n8n_status");
					setStatus((prev) => ({
						...prev,
						n8n: n8nStatus.running ? "running" : "stopped",
					}));
				} catch (statusError) {
					setStatus((prev) => ({ ...prev, n8n: "stopped" }));
				}
			}

			// Final logs refresh
			if (onLogsRefresh) {
				try {
					await onLogsRefresh();
				} catch (logError) {
					console.log("Could not do final logs refresh after stop");
				}
			}
		} catch (error) {
			console.error("Failed to stop N8N:", error);
			setStatus((prev) => ({ ...prev, n8n: "unknown" }));
			// Re-throw with more context
			throw new Error(`Failed to stop N8N: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	const getLogs = async () => {
		try {
			const logs = await invoke<string>("get_n8n_logs");
			return logs;
		} catch (error) {
			console.error("Failed to get logs:", error);
			// Return a more user-friendly error message
			throw new Error(`Failed to get logs: ${error}`);
		}
	};

	const getDebugPaths = async () => {
		try {
			const debugInfo = await invoke<string>("debug_paths");
			return debugInfo;
		} catch (error) {
			console.error("Failed to get debug paths:", error);
			throw new Error(`Failed to get debug paths: ${error}`);
		}
	};

	useEffect(() => {
		// Check status on mount
		checkDockerStatus();
	}, [checkDockerStatus]);

	return {
		status,
		loading,
		simulationMode,
		checkDockerStatus,
		startN8N,
		startN8NWithProgress,
		stopN8N,
		getLogs,
		getDebugPaths,
		setManualState,
		setManualLoading,
		toggleSimulation,
	};
}
