import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

export function DockerInstallGuide() {
	const getDockerInstallUrl = () => {
		const platform = navigator.platform.toLowerCase();
		const userAgent = navigator.userAgent.toLowerCase();

		console.log("Platform:", platform, "UserAgent:", userAgent);

		// More comprehensive OS detection with direct download links
		if (platform.includes("mac") || userAgent.includes("mac") || userAgent.includes("darwin")) {
			// For Mac, use the direct Docker Desktop download
			return "https://desktop.docker.com/mac/main/amd64/Docker.dmg";
		} else if (platform.includes("win") || userAgent.includes("windows") || userAgent.includes("win32") || userAgent.includes("win64")) {
			// For Windows, use the direct Docker Desktop download
			return "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe";
		} else {
			// For Linux, redirect to the installation docs since there are multiple distributions
			return "https://docs.docker.com/desktop/install/linux-install/";
		}
	};

	const handleInstallClick = async () => {
		const url = getDockerInstallUrl();
		console.log("Opening Docker install URL:", url);
		try {
			await openUrl(url);
		} catch (error) {
			console.error("Failed to open URL:", error);
			// Fallback to window.open if Tauri API fails
			window.open(url, "_blank");
		}
	};

	return (
		<Card className="bg-gradient-card border-border/50">
			<CardContent className="p-6 space-y-4">
				<div className="text-center space-y-2">
					<Download className="h-12 w-12 text-primary mx-auto" />
					<h2 className="text-xl font-bold text-foreground">Docker Not Found</h2>
					<p className="text-muted-foreground">
						Docker needs to be installed to run N8N.
					</p>
				</div>

				<Alert>
					<AlertDescription>
						Docker includes everything you need to run containerized applications
						like N8N.
					</AlertDescription>
				</Alert>

				<div className="space-y-3">
					<Button
						variant="gradient"
						size="lg"
						className="w-full"
						onClick={handleInstallClick}
					>
						<Download className="mr-2 h-5 w-5" />
						Install Docker
					</Button>
				</div>

				<div className="text-center pt-4 border-t border-border/50">
					<p className="text-sm text-muted-foreground mb-2">
						After installing Docker, restart this application
					</p>
					<Button variant="secondary" onClick={() => window.location.reload()}>
						Refresh Application
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}