import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface LogsCardProps {
	logs: string | string[];
	loading: boolean;
	visible: boolean;
	title: string;
	onRefresh?: () => Promise<void>;
	showRefreshButton?: boolean;
}

export function LogsCard({
	logs,
	loading,
	visible,
	title,
	onRefresh,
	showRefreshButton = true,
}: LogsCardProps) {
	const logsScrollRef = useRef<React.ComponentRef<typeof ScrollArea>>(null);

	// Auto-scroll helper function
	const scrollToBottom = useCallback(
		(ref: React.RefObject<React.ComponentRef<typeof ScrollArea> | null>) => {
			if (ref.current) {
				// Find the ScrollArea viewport which is the actual scrollable container
				const viewport = ref.current.querySelector(
					"[data-radix-scroll-area-viewport]",
				) as HTMLElement;
				if (viewport) {
					viewport.scrollTop = viewport.scrollHeight;
				}
			}
		},
		[],
	);

	// Auto-scroll effect for logs
	useEffect(() => {
		if (logs) {
			setTimeout(() => scrollToBottom(logsScrollRef), 100);
		}
	}, [logs, scrollToBottom]);

	if (!visible) {
		return null;
	}

	return (
		<Card className="bg-gradient-card border-border/50 w-full min-w-0">
			<CardContent className="p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-foreground">{title}</h3>
					<div className="flex items-center gap-2">
						{!showRefreshButton && (
							<RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
						)}
						{showRefreshButton && onRefresh && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onRefresh}
								disabled={loading}
								className="h-7 px-2 text-xs"
							>
								<RefreshCw
									className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
								/>
							</Button>
						)}
					</div>
				</div>
				<div className="bg-black/20 rounded-lg w-full min-w-0">
					<ScrollArea ref={logsScrollRef} className="h-60 px-4">
						<div className="font-mono text-xs w-full min-w-0 py-4">
							{loading &&
							(!logs || (Array.isArray(logs) && logs.length === 0)) ? (
								<div className="text-muted-foreground">
									{Array.isArray(logs) ? "Initializing..." : "Loading logs..."}
								</div>
							) : Array.isArray(logs) ? (
								<div className="space-y-1">
									{logs.map((message, index) => (
										<div
											key={`log-${index}-${message.slice(0, 20)}`}
											className="text-muted-foreground break-words overflow-hidden w-[290px]"
										>
											{message}
										</div>
									))}
								</div>
							) : logs ? (
								<pre className="whitespace-pre-wrap text-muted-foreground break-words overflow-hidden">
									{logs}
								</pre>
							) : (
								<div className="text-muted-foreground">No logs available</div>
							)}
						</div>
					</ScrollArea>
				</div>
			</CardContent>
		</Card>
	);
}
