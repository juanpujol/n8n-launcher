// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::command;
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;

// Global storage for discovered Docker path
static DOCKER_PATH: Mutex<Option<String>> = Mutex::new(None);

#[derive(Serialize, Deserialize)]
struct DockerStatus {
    installed: bool,
    running: bool,
    version: Option<String>,
}

#[command]
async fn check_docker_status(app: tauri::AppHandle) -> Result<DockerStatus, String> {
    let shell = app.shell();
    
    // Try multiple Docker locations since macOS apps don't inherit PATH
    let docker_paths = vec![
        "docker",                    // Try PATH first
        "/usr/local/bin/docker",     // Common Homebrew location
        "/opt/homebrew/bin/docker",  // ARM Homebrew location
        "/Applications/Docker.app/Contents/Resources/bin/docker", // Docker Desktop
    ];
    
    for docker_path in docker_paths {
        let version_cmd = shell.command(docker_path).args(["--version"]);
        
        // Add a reasonable timeout to prevent hanging
        let version_result = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            version_cmd.output()
        ).await;
        
        match version_result {
            Ok(Ok(output)) => {
                if output.status.success() {
                    let version = String::from_utf8_lossy(&output.stdout).to_string();
                    
                    // Check if Docker daemon is running using the same path
                    let ps_cmd = shell.command(docker_path).args(["ps"]);
                    
                    let running = match tokio::time::timeout(
                        std::time::Duration::from_secs(5),
                        ps_cmd.output()
                    ).await {
                        Ok(Ok(ps_out)) => ps_out.status.success(),
                        _ => false,
                    };
                    
                    // Store the working Docker path for future use
                    if let Ok(mut path) = DOCKER_PATH.lock() {
                        *path = Some(docker_path.to_string());
                    }
                    
                    return Ok(DockerStatus {
                        installed: true,
                        running,
                        version: Some(version.trim().to_string()),
                    });
                }
            }
            Ok(Err(_)) => {
                // Continue to next path
            }
            Err(_) => {
                // Timeout - continue to next path
            }
        }
    }
    
    // If we get here, none of the Docker paths worked
    Ok(DockerStatus {
        installed: false,
        running: false,
        version: None,
    })
}

#[command]
async fn start_n8n(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    
    // Try multiple docker-compose locations
    let docker_compose_paths = vec![
        "docker-compose",
        "/usr/local/bin/docker-compose",
        "/opt/homebrew/bin/docker-compose",
    ];
    
    for docker_compose_path in docker_compose_paths {
        let cmd = shell.command(docker_compose_path).args(["up", "-d"]);
        
        match cmd.output().await {
            Ok(output) => {
                if output.status.success() {
                    return Ok("N8N started successfully".to_string());
                } else {
                    // Continue to next path on error
                    continue;
                }
            }
            Err(_) => {
                // Continue to next path on error
                continue;
            }
        }
    }
    
    Err("Failed to start N8N: docker-compose not found in any expected location".to_string())
}

#[command]
async fn stop_n8n(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    let cmd = shell.command("docker-compose").args(["down"]);
    
    match cmd.output().await {
        Ok(output) => {
            if output.status.success() {
                Ok("N8N stopped successfully".to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to stop N8N: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to stop N8N: {}", e)),
    }
}

#[command]
async fn check_n8n_status(_app: tauri::AppHandle) -> Result<bool, String> {
    // Get N8N port from environment or use default
    let port = std::env::var("N8N_PORT").unwrap_or_else(|_| "5678".to_string());
    let base_url = format!("http://localhost:{}", port);
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Try multiple endpoints to check if N8N is responding
    let endpoints = vec![
        format!("{}/healthz", base_url),    // Health check endpoint
        format!("{}/api/v1/health", base_url), // Alternative health endpoint
        base_url.clone(),                   // Root endpoint
    ];
    
    for endpoint in endpoints {
        match client.get(&endpoint).send().await {
            Ok(response) => {
                if response.status().is_success() || response.status().as_u16() == 401 {
                    // 401 also means N8N is running (just needs auth)
                    return Ok(true);
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(false)
}

#[command]
async fn get_n8n_logs(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    let cmd = shell.command("docker-compose").args(["logs", "--tail=100"]);
    
    match cmd.output().await {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to get logs: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to get logs: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_docker_status,
            check_n8n_status,
            start_n8n,
            stop_n8n,
            get_n8n_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}