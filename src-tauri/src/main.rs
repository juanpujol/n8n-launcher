// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, Manager, Emitter};
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;
use std::path::PathBuf;

// Global storage for discovered Docker path
static DOCKER_PATH: Mutex<Option<String>> = Mutex::new(None);

fn get_docker_compose_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut search_paths = Vec::new();
    
    // Try to find docker-compose.yaml in the resource directory first (for built app)
    if let Ok(resource_path) = app.path().resource_dir() {
        let compose_path = resource_path.join("docker-compose.yaml");
        search_paths.push(format!("Resource directory: {:?}", resource_path));
        if compose_path.exists() {
            return Ok(resource_path);
        }
    }
    
    // Try current directory (for development)
    if let Ok(current_dir) = std::env::current_dir() {
        let compose_path = current_dir.join("docker-compose.yaml");
        search_paths.push(format!("Current directory: {:?}", current_dir));
        if compose_path.exists() {
            return Ok(current_dir);
        }
        
        // Try project root (go up one level from src-tauri in development)
        if let Some(project_root) = current_dir.parent() {
            let compose_path = project_root.join("docker-compose.yaml");
            search_paths.push(format!("Project root: {:?}", project_root));
            if compose_path.exists() {
                return Ok(project_root.to_path_buf());
            }
        }
    }
    
    // Try going up from exe location (for built app edge cases)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let compose_path = exe_dir.join("docker-compose.yaml");
            search_paths.push(format!("Exe directory: {:?}", exe_dir));
            if compose_path.exists() {
                return Ok(exe_dir.to_path_buf());
            }
            
            // Try parent of exe directory
            if let Some(exe_parent) = exe_dir.parent() {
                let compose_path = exe_parent.join("docker-compose.yaml");
                search_paths.push(format!("Exe parent directory: {:?}", exe_parent));
                if compose_path.exists() {
                    return Ok(exe_parent.to_path_buf());
                }
            }
        }
    }
    
    // Try app local data directory as fallback
    if let Ok(app_local_data_dir) = app.path().app_local_data_dir() {
        let compose_path = app_local_data_dir.join("docker-compose.yaml");
        search_paths.push(format!("App local data directory: {:?}", app_local_data_dir));
        if compose_path.exists() {
            return Ok(app_local_data_dir);
        }
    }
    
    // Try app data directory as fallback
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let compose_path = app_data_dir.join("docker-compose.yaml");
        search_paths.push(format!("App data directory: {:?}", app_data_dir));
        if compose_path.exists() {
            return Ok(app_data_dir);
        }
    }
    
    Err(format!(
        "docker-compose.yaml not found. Searched in:\n{}",
        search_paths.join("\n- ")
    ))
}

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
    
    // Get the directory containing docker-compose.yaml
    let compose_dir = get_docker_compose_dir(&app)?;
    
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
        let cmd = shell.command(docker_compose_path)
            .args(["up", "-d"])
            .current_dir(&compose_dir);
        
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
async fn start_n8n_streaming(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    
    // Get the directory containing docker-compose.yaml
    let compose_dir = get_docker_compose_dir(&app)?;
    
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
        let cmd = shell.command(docker_compose_path)
            .args(["up", "-d"])
            .current_dir(&compose_dir);
        
        // Emit start event
        let _ = app.emit("docker-progress", "Starting N8N containers...");
        
        // Execute command with progress updates
        let app_clone = app.clone();
        let progress_task = tokio::spawn(async move {
            let messages = vec![
                "Checking Docker images...",
                "Pulling N8N images (this may take a while)...",
                "Starting PostgreSQL database...",
                "Starting Redis cache...", 
                "Starting N8N editor...",
                "Starting N8N webhook handler...",
                "Starting N8N workers...",
                "Waiting for services to be ready...",
            ];
            
            for (i, message) in messages.iter().enumerate() {
                let _ = app_clone.emit("docker-progress", message);
                tokio::time::sleep(std::time::Duration::from_millis(2000 + i as u64 * 1000)).await;
            }
        });
        
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(300), // 5 minutes timeout
            cmd.output()
        ).await;
        
        // Cancel the progress task
        progress_task.abort();
        
        match result {
            Ok(Ok(output)) => {
                if output.status.success() {
                    let _ = app.emit("docker-progress", "N8N containers started successfully!");
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    
                    // Emit any actual output we got
                    if !stdout.trim().is_empty() {
                        let _ = app.emit("docker-progress", &format!("Output: {}", stdout.trim()));
                    }
                    if !stderr.trim().is_empty() {
                        let _ = app.emit("docker-progress", &format!("Info: {}", stderr.trim()));
                    }
                    
                    return Ok("N8N started successfully with progress updates".to_string());
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    let error_msg = format!("Command failed with exit code {}: {}", output.status.code().unwrap_or(-1), error);
                    let _ = app.emit("docker-progress", &format!("Error: {}", error_msg));
                    last_error = error_msg;
                    continue;
                }
            }
            Ok(Err(e)) => {
                last_error = format!("Command execution error: {}", e);
                let _ = app.emit("docker-progress", &format!("Error: {}", last_error));
                continue;
            }
            Err(_) => {
                last_error = "Command timed out after 5 minutes".to_string();
                let _ = app.emit("docker-progress", &format!("Error: {}", last_error));
                continue;
            }
        }
    }
    
    Err(format!("Failed to start N8N with streaming. Last error: {}", last_error))
}

#[command]
async fn stop_n8n(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    
    // Get the directory containing docker-compose.yaml
    let compose_dir = get_docker_compose_dir(&app)?;
    
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
        let cmd = shell.command(docker_compose_path)
            .args(["down"])
            .current_dir(&compose_dir);
        
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
    
    // Get the directory containing docker-compose.yaml
    let compose_dir = get_docker_compose_dir(&app)?;
    
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
        let cmd = shell.command(docker_compose_path)
            .args(["logs", "--tail=100"])
            .current_dir(&compose_dir);
        
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

#[command]
async fn debug_paths(app: tauri::AppHandle) -> Result<String, String> {
    let mut debug_info = Vec::new();
    
    // Current working directory
    if let Ok(current_dir) = std::env::current_dir() {
        debug_info.push(format!("Current directory: {:?}", current_dir));
    }
    
    // Executable path
    if let Ok(exe_path) = std::env::current_exe() {
        debug_info.push(format!("Executable path: {:?}", exe_path));
    }
    
    // Resource directory
    if let Ok(resource_path) = app.path().resource_dir() {
        debug_info.push(format!("Resource directory: {:?}", resource_path));
        
        // List files in resource directory
        if let Ok(entries) = std::fs::read_dir(&resource_path) {
            let mut files = Vec::new();
            for entry in entries {
                if let Ok(entry) = entry {
                    files.push(format!("{:?}", entry.file_name()));
                }
            }
            debug_info.push(format!("Files in resource directory: {:?}", files));
        }
    }
    
    // App data directories
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        debug_info.push(format!("App data directory: {:?}", app_data_dir));
    }
    
    if let Ok(app_local_data_dir) = app.path().app_local_data_dir() {
        debug_info.push(format!("App local data directory: {:?}", app_local_data_dir));
    }
    
    Ok(debug_info.join("\n"))
}

fn main() {
    // Fix PATH environment variable for bundled macOS apps
    fix_path_env::fix().ok();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_docker_status,
            check_n8n_status,
            start_n8n,
            start_n8n_streaming,
            stop_n8n,
            get_n8n_logs,
            debug_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}