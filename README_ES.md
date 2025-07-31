# N8N Launcher

[🇺🇸 English](README.md) | [🇧🇷 Portugués](README_PT_BR.md)

Una aplicación de escritorio multiplataforma para iniciar fácilmente tu instancia local de N8N. Este launcher proporciona una interfaz amigable para la gestión del ciclo de vida de contenedores Docker, monitoreo de estado y visualización de logs para una stack completa de N8N.

![Captura de pantalla de N8N Launcher](app-print.jpg)

## 🐳 Requisitos previos

**Docker Desktop debe estar instalado y ejecutándose** en tu máquina antes de usar N8N Launcher. La aplicación gestiona N8N a través de contenedores Docker.

- **Descargar Docker Desktop**: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Asegúrate de que Docker esté ejecutándose** antes de lanzar N8N Launcher

## ⚠️ Aviso Importante de Seguridad

**N8N Launcher es un prototipo simple construido sin certificados oficiales de firma de código de Apple o Microsoft.** Esto significa que tu sistema operativo mostrará advertencias de seguridad cuando ejecutes la aplicación por primera vez.

### 🍎 Instalación en macOS

1. **Descarga y abre el archivo .dmg**
2. **Arrastra N8N Launcher a la carpeta Aplicaciones**
3. **Cuando ejecutes la app por primera vez**, macOS mostrará: *"N8N Launcher no se puede abrir porque es de un desarrollador no identificado"*
4. **Para autorizar la app:**
   - Ve a **Preferencias del Sistema** → **Seguridad y Privacidad** → **General**
   - Verás un mensaje sobre N8N Launcher siendo bloqueado
   - Haz clic en **"Abrir de todas formas"**
   - Confirma haciendo clic en **"Abrir"** en el diálogo

### 🪟 Instalación en Windows

1. **Descarga y ejecuta el instalador .msi**
2. **Windows puede mostrar**: *"Windows protegió tu PC"* o *"Editor desconocido"*
3. **Para autorizar la app:**
   - Haz clic en **"Más información"** en el diálogo de Windows Defender SmartScreen
   - Haz clic en **"Ejecutar de todas formas"**
   - Completa la instalación normalmente

> **Por qué sucede esto:** Como esta es una aplicación prototipo, no he comprado certificados caros de firma de código de Apple o Microsoft. La app es completamente segura de usar - tu SO solo está siendo cauteloso sobre aplicaciones sin firmar.

## 📥 Descarga

Obtén la última versión de N8N Launcher para tu plataforma:

| Plataforma | Descarga |
|------------|----------|
| 🍎 **macOS** | [Descargar para macOS](https://github.com/juanpujol/n8n-launcher/releases/download/v0.1.3/n8n-launcher_0.1.3_aarch64.dmg) |
| 🪟 **Windows** | [Descargar para Windows](https://github.com/juanpujol/n8n-launcher/releases/download/v0.1.3/n8n-launcher_0.1.3_x64_en-US.msi) |

> 💡 **Consejo**: Para las últimas versiones y todos los formatos disponibles, visita nuestra [página de Releases](https://github.com/juanpujol/n8n-launcher/releases).

## Características

- 🐳 **Gestión Docker**: Iniciar/detener stack N8N con PostgreSQL, Redis y servicios N8N
- 📊 **Monitoreo de Estado**: Verificación de estado de contenedores Docker en tiempo real
- 📝 **Visualización de Logs**: Ver logs de contenedores N8N directamente en la app
- 🖥️ **Multiplataforma**: Soporta macOS (Intel/Apple Silicon) y Windows
- 🔒 **Seguro**: Acceso restringido al shell con capacidades Tauri
- ⚡ **Rápido**: Construido con backend Rust y frontend React

## Requisitos previos

- **Docker Desktop** debe estar instalado y ejecutándose
- **Bun** runtime para desarrollo

## Instalación

### Desde Releases
Descarga la última versión para tu plataforma:
- **macOS**: Descarga el archivo `.dmg` o `.zip` que contiene el bundle `.app`
- **Windows**: Descarga el instalador `.msi` o la versión portable `.exe`

### Configuración de Desarrollo

1. Clona el repositorio:
```bash
git clone <repository-url>
cd pocket-n8n
```

2. Instala las dependencias:
```bash
bun install
```

## Desarrollo

### Desarrollo Frontend
```bash
# Iniciar servidor de desarrollo Vite (puerto 5173)
bun run dev

# Construir frontend para producción
bun run build

# Previsualizar build de producción
bun run preview
```

### Desarrollo Tauri
```bash
# Iniciar app Tauri en modo desarrollo (incluye hot reload del frontend)
bun run tauri:dev

# Construir app Tauri para producción/distribución
bun run tauri:build
```

### Builds Específicos por Plataforma
```bash
# Construir para macOS Apple Silicon
bun run tauri:build:mac

# Construir para macOS Intel
bun run tauri:build:mac-intel

# Compilación cruzada para Windows/Linux no soportada localmente
# Usa el workflow de GitHub Actions para builds multiplataforma
```

### Formateo de Código
```bash
# Formatear código con Biome
bun run lint
```

## Arquitectura

### Stack Tecnológico
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Estilos**: Tailwind CSS + componentes Radix UI
- **Build**: Bundler Tauri para empaquetado de app nativa

### Stack Docker
La aplicación gestiona un entorno N8N completo con:
- **PostgreSQL 16**: Base de datos con verificaciones de salud
- **Redis 7**: Gestión de colas con autenticación
- **N8N Editor**: Interfaz principal (puerto 5678)
- **N8N Webhook**: Procesador dedicado de webhooks
- **N8N Worker**: Procesador de trabajos en segundo plano

### Seguridad
- Acceso al shell restringido a comandos Docker específicos vía capacidades Tauri
- Firma de código ad-hoc habilitada para builds macOS
- Sin acceso directo al sistema de archivos más allá de los permisos configurados

## Uso

1. **Lanza la app** - N8N Launcher iniciará con una interfaz limpia
2. **Verifica el estado de Docker** - La app verifica que Docker esté instalado y ejecutándose
3. **Inicia N8N** - Haz clic para iniciar la stack completa de N8N vía Docker Compose
4. **Monitorea el estado** - Ve el estado de contenedores y logs en tiempo real
5. **Accede a N8N** - Abre la interfaz web de N8N en `http://localhost:5678`
6. **Detén cuando termines** - Detén todos los contenedores limpiamente cuando finalices

## Configuración

### Variables de Entorno
La stack Docker soporta personalización vía variables de entorno:
- `N8N_PORT`, `N8N_HOST`, `N8N_PROTOCOL` - Configuración de URL
- `DB_POSTGRESDB_*` - Credenciales de base de datos
- `QUEUE_BULL_REDIS_PASSWORD` - Autenticación Redis
- `EXECUTIONS_DATA_MAX_AGE`, `EXECUTIONS_DATA_PRUNE_MAX_COUNT` - Límites de ejecución

### Configuración N8N
- Puerto por defecto: 5678 (configurable vía N8N_PORT)
- Ejecución basada en colas con respaldo Redis
- PostgreSQL para almacenamiento persistente de datos
- Limpieza automática de datos (edad máxima 168 horas, límite 1000 ejecuciones)
- Volumen compartido para persistencia de datos entre reinicios de contenedor

## Contribuyendo

Este proyecto usa:
- **Bun** para gestión de paquetes y ejecución de scripts
- **Biome** para formateo y linting de código
- **GitHub Actions** para builds y releases automatizados

## Construyendo Releases

Los releases están automatizados vía GitHub Actions. Para crear un nuevo release:

1. Usa el workflow "Cross-Platform Release" en GitHub Actions
2. Elige el tipo de incremento de versión (patch/minor/major) o especifica versión personalizada
3. El workflow:
   - Actualizará la versión en todos los archivos relevantes
   - Creará tag git
   - Construirá para todas las plataformas
   - Creará release en GitHub con changelog
   - Subirá artefactos específicos por plataforma

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ve el archivo [LICENSE](LICENSE) para detalles.