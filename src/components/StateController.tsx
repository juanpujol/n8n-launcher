import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ServiceStatus } from "@/hooks/useDockerStatus";
import { Pause, Play, RefreshCw, Settings } from "lucide-react";
import { useState } from "react";

interface StateControllerProps {
	onStateChange: (docker: ServiceStatus, n8n: ServiceStatus) => void;
	onLoadingChange: (loading: boolean) => void;
	onSimulationToggle: (enabled: boolean) => void;
	currentStates: { docker: ServiceStatus; n8n: ServiceStatus };
	loading: boolean;
	simulationEnabled: boolean;
}

export function StateController({
	onStateChange,
	onLoadingChange,
	onSimulationToggle,
	currentStates,
	loading,
	simulationEnabled,
}: StateControllerProps) {
	const [isOpen, setIsOpen] = useState(false);

	const states: ServiceStatus[] = [
		"running",
		"stopped",
		"unknown",
		"not-found",
	];

	const toggleLoading = () => {
		onLoadingChange(!loading);
		setTimeout(() => onLoadingChange(false), 2000);
	};

	return (
		<div className="fixed top-4 right-4 z-50">
			<div className="flex flex-col items-end gap-2">
				{isOpen && (
					<Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
						<CardContent className="p-4 space-y-3 min-w-[220px]">
							<h3 className="text-sm font-medium text-foreground">
								State Controller
							</h3>

							{/* Simulation Mode Toggle */}
							<div className="space-y-2 pb-2 border-b border-border/50">
								<div className="text-xs text-muted-foreground">Mode:</div>
								<Button
									size="sm"
									variant={simulationEnabled ? "default" : "outline"}
									className="w-full text-xs"
									onClick={() => onSimulationToggle(!simulationEnabled)}
								>
									{simulationEnabled ? (
										<>
											<Pause className="w-3 h-3 mr-1" />
											Simulation Enabled
										</>
									) : (
										<>
											<Play className="w-3 h-3 mr-1" />
											Real API Mode
										</>
									)}
								</Button>
							</div>

							{/* Manual State Controls - Only show when simulation is enabled */}
							{simulationEnabled && (
								<>
									<div className="space-y-2">
										<div className="text-xs text-muted-foreground">
											Docker Status:
										</div>
										<div className="flex gap-1 flex-wrap">
											{states.map((state) => (
												<Button
													key={state}
													size="sm"
													variant={
														currentStates.docker === state
															? "default"
															: "outline"
													}
													className="text-xs px-2 py-1 h-6"
													onClick={() =>
														onStateChange(state, currentStates.n8n)
													}
												>
													{state}
												</Button>
											))}
										</div>
									</div>

									<div className="space-y-2">
										<div className="text-xs text-muted-foreground">
											N8N Status:
										</div>
										<div className="flex gap-1 flex-wrap">
											{states.map((state) => (
												<Button
													key={state}
													size="sm"
													variant={
														currentStates.n8n === state ? "default" : "outline"
													}
													className="text-xs px-2 py-1 h-6"
													onClick={() =>
														onStateChange(currentStates.docker, state)
													}
												>
													{state}
												</Button>
											))}
										</div>
									</div>

									<Button
										size="sm"
										variant="outline"
										className="w-full text-xs"
										onClick={toggleLoading}
										disabled={loading}
									>
										<RefreshCw className="w-3 h-3 mr-1" />
										Toggle Loading
									</Button>
								</>
							)}

							{/* Real API Mode Message */}
							{!simulationEnabled && (
								<div className="text-xs text-muted-foreground text-center py-2">
									Using real Docker APIs.
									<br />
									Enable simulation to manually control states.
								</div>
							)}
						</CardContent>
					</Card>
				)}

				<Button
					size="sm"
					variant="outline"
					className="bg-card/95 backdrop-blur border-border/50 shadow-lg"
					onClick={() => setIsOpen(!isOpen)}
				>
					<Settings className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}
