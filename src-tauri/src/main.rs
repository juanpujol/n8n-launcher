// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::command;
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Deserialize)]
struct DockerStatus {
    installed: bool,
    running: bool,
    version: Option<String>,
}

#[command]
async fn check_docker_status(app: tauri::AppHandle) -> Result<DockerStatus, String> {
    let shell = app.shell();
    
    // Check if Docker is installed
    let version_cmd = shell.command("docker").args(["--version"]);
    
    match version_cmd.output().await {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).to_string();
                
                // Check if Docker daemon is running
                let ps_cmd = shell.command("docker").args(["ps"]);
                
                let running = match ps_cmd.output().await {
                    Ok(ps_out) => ps_out.status.success(),
                    Err(_) => false,
                };
                
                Ok(DockerStatus {
                    installed: true,
                    running,
                    version: Some(version.trim().to_string()),
                })
            } else {
                Ok(DockerStatus {
                    installed: false,
                    running: false,
                    version: None,
                })
            }
        }
        Err(_) => Ok(DockerStatus {
            installed: false,
            running: false,
            version: None,
        }),
    }
}

#[command]
async fn start_n8n(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    let cmd = shell.command("docker-compose").args(["up", "-d"]);
    
    match cmd.output().await {
        Ok(output) => {
            if output.status.success() {
                Ok("N8N started successfully".to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to start N8N: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to start N8N: {}", e)),
    }
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