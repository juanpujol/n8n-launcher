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

#[derive(Serialize, Deserialize)]
struct N8NStatus {
    running: bool,
    containers_exist: bool,
    images_available: bool,
    error_message: Option<String>,
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
    
    // Try multiple docker-compose locations (including Windows paths)
    let docker_compose_paths = vec![
        "docker-compose",
        "/usr/local/bin/docker-compose",
        "/opt/homebrew/bin/docker-compose",
        "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe",
        "C:\\ProgramData\\DockerDesktop\\version-bin\\docker-compose.exe",
    ];
    
    let mut last_error = String::new();
    
    for docker_compose_path in docker_compose_paths {
        let cmd = shell.command(docker_compose_path).args(["up", "-d"]);
        
        // Add timeout to prevent hanging
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(300), // 5 minutes timeout for image downloads
            cmd.output()
        ).await;
        
        match result {
            Ok(Ok(output)) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    return Ok(format!("N8N started successfully. Output: {}\nErrors: {}", stdout, stderr));
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    last_error = format!("Command failed with exit code {}: {}", output.status.code().unwrap_or(-1), error);
                    continue;
                }
            }
            Ok(Err(e)) => {
                last_error = format!("Command execution error: {}", e);
                continue;
            }
            Err(_) => {
                last_error = "Command timed out after 5 minutes".to_string();
                continue;
            }
        }
    }
    
    Err(format!("Failed to start N8N. Last error: {}", last_error))
}

#[command]
async fn stop_n8n(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    
    // Try multiple docker-compose locations (including Windows paths)
    let docker_compose_paths = vec![
        "docker-compose",
        "/usr/local/bin/docker-compose",
        "/opt/homebrew/bin/docker-compose",
        "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe",
        "C:\\ProgramData\\DockerDesktop\\version-bin\\docker-compose.exe",
    ];
    
    let mut last_error = String::new();
    
    for docker_compose_path in docker_compose_paths {
        let cmd = shell.command(docker_compose_path).args(["down"]);
        
        // Add timeout
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(60), // 1 minute timeout for stop
            cmd.output()
        ).await;
        
        match result {
            Ok(Ok(output)) => {
                if output.status.success() {
                    return Ok("N8N stopped successfully".to_string());
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    last_error = format!("Command failed: {}", error);
                    continue;
                }
            }
            Ok(Err(e)) => {
                last_error = format!("Command execution error: {}", e);
                continue;
            }
            Err(_) => {
                last_error = "Command timed out after 1 minute".to_string();
                continue;
            }
        }
    }
    
    Err(format!("Failed to stop N8N. Last error: {}", last_error))
}

#[command]
async fn check_n8n_status(app: tauri::AppHandle) -> Result<N8NStatus, String> {
    let shell = app.shell();
    let docker_paths = vec![
        "docker",
        "/usr/local/bin/docker",
        "/opt/homebrew/bin/docker",
        "/Applications/Docker.app/Contents/Resources/bin/docker",
        "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
    ];
    
    let mut docker_path_found = None;
    
    // Find working docker path
    for docker_path in &docker_paths {
        let cmd = shell.command(docker_path).args(["--version"]);
        if let Ok(Ok(output)) = tokio::time::timeout(
            std::time::Duration::from_secs(2),
            cmd.output()
        ).await {
            if output.status.success() {
                docker_path_found = Some(*docker_path);
                break;
            }
        }
    }
    
    let docker_path = docker_path_found.ok_or("Docker not found")?;
    
    // Check if N8N images are available
    let images_cmd = shell.command(docker_path).args(["images", "n8nio/n8n", "--format", "{{.Repository}}"]);
    let images_available = if let Ok(Ok(output)) = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        images_cmd.output()
    ).await {
        output.status.success() && !String::from_utf8_lossy(&output.stdout).trim().is_empty()
    } else {
        false
    };
    
    // Check if containers are running
    let ps_cmd = shell.command(docker_path).args(["ps", "--filter", "name=n8n", "--format", "{{.Names}}"]);
    let containers_running = if let Ok(Ok(output)) = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        ps_cmd.output()
    ).await {
        output.status.success() && String::from_utf8_lossy(&output.stdout).contains("n8n")
    } else {
        false
    };
    
    // Check if containers exist (even if stopped)
    let ps_all_cmd = shell.command(docker_path).args(["ps", "-a", "--filter", "name=n8n", "--format", "{{.Names}}"]);
    let containers_exist = if let Ok(Ok(output)) = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        ps_all_cmd.output()
    ).await {
        output.status.success() && String::from_utf8_lossy(&output.stdout).contains("n8n")
    } else {
        false
    };
    
    if !containers_running {
        return Ok(N8NStatus {
            running: false,
            containers_exist,
            images_available,
            error_message: None,
        });
    }
    
    // If containers are running, check HTTP endpoints
    let port = std::env::var("N8N_PORT").unwrap_or_else(|_| "5678".to_string());
    let base_url = format!("http://localhost:{}", port);
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let endpoints = vec![
        format!("{}/healthz", base_url),
        format!("{}/api/v1/health", base_url),
        base_url.clone(),
    ];
    
    for endpoint in endpoints {
        match client.get(&endpoint).send().await {
            Ok(response) => {
                if response.status().is_success() || response.status().as_u16() == 401 {
                    return Ok(N8NStatus {
                        running: true,
                        containers_exist: true,
                        images_available: true,
                        error_message: None,
                    });
                }
            }
            Err(_) => continue,
        }
    }
    
    // Containers running but N8N not responding
    Ok(N8NStatus {
        running: false,
        containers_exist: true,
        images_available: true,
        error_message: Some("Containers running but N8N not responding".to_string()),
    })
}

#[command]
async fn get_n8n_logs(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    
    // Try multiple docker-compose locations (including Windows paths)
    let docker_compose_paths = vec![
        "docker-compose",
        "/usr/local/bin/docker-compose",
        "/opt/homebrew/bin/docker-compose",
        "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe",
        "C:\\ProgramData\\DockerDesktop\\version-bin\\docker-compose.exe",
    ];
    
    let mut last_error = String::new();
    
    for docker_compose_path in docker_compose_paths {
        let cmd = shell.command(docker_compose_path).args(["logs", "--tail=100"]);
        
        // Add timeout
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(10), // 10 seconds timeout for logs
            cmd.output()
        ).await;
        
        match result {
            Ok(Ok(output)) => {
                if output.status.success() {
                    return Ok(String::from_utf8_lossy(&output.stdout).to_string());
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    last_error = format!("Command failed: {}", error);
                    continue;
                }
            }
            Ok(Err(e)) => {
                last_error = format!("Command execution error: {}", e);
                continue;
            }
            Err(_) => {
                last_error = "Command timed out after 10 seconds".to_string();
                continue;
            }
        }
    }
    
    Err(format!("Failed to get logs. Last error: {}", last_error))
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