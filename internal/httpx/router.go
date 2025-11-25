package httpx

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"sft/internal/config"
	"sft/internal/features/builder"
	tmplhelpers "sft/internal/httpx/templates"
	"sft/internal/services"
)

// NewRouter wires templates, handlers, and static assets into an http.Handler.
func NewRouter(cfg config.Config) (http.Handler, error) {
	tmpl, err := template.New("").Funcs(tmplhelpers.Funcs()).ParseGlob("templates/**/*.gohtml")
	if err != nil {
		return nil, fmt.Errorf("template loading failed: %w", err)
	}

	unitsLoader := services.NewUnitsLoader(services.LoadUnitsConfig{
		SetDataPath: cfg.SetDataPath,
		TraitDir:    cfg.TraitAssetsDir,
		UnitDir:     cfg.UnitAssetsDir,
		SpellDir:    cfg.SpellAssetsDir,
	})

	canonical := strings.TrimRight(cfg.SiteURL, "/")
	if canonical != "" {
		canonical += "/"
	}

	assetManifest := loadAssetManifest("static/dist/manifest.json")
	assets := resolveAssetPaths(assetManifest)

	mux := http.NewServeMux()
	mux.HandleFunc("/", builder.NewHandler(unitsLoader, tmpl, cfg.StaticBaseURL, canonical, assets))
	mux.HandleFunc("/robots.txt", serveRobots)

	fs := http.FileServer(http.Dir("./static"))
	staticHandler := http.StripPrefix(cfg.StaticBaseURL+"/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cfg.StaticCacheSec <= 0 {
			w.Header().Set("Cache-Control", "no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
		} else {
			w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", cfg.StaticCacheSec))
		}
		fs.ServeHTTP(w, r)
	}))
	mux.Handle(cfg.StaticBaseURL+"/", staticHandler)

	return withGzip(mux), nil
}

// serveRobots exposes a root-level robots.txt (served from ./static/robots.txt).
func serveRobots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	http.ServeFile(w, r, "static/robots.txt")
}

// withGzip wraps the handler with a minimal gzip middleware for text responses.
// It avoids double-compressing already compressed asset types.
func withGzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Respect clients that do not accept gzip or HEAD requests.
		if r.Method == http.MethodHead || !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		if !shouldCompress(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")

		gzw := gzip.NewWriter(w)
		defer gzw.Close()

		gzr := gzipResponseWriter{
			ResponseWriter: w,
			Writer:         gzw,
		}
		next.ServeHTTP(&gzr, r)
	})
}

// gzipResponseWriter proxies writes through the gzip writer while preserving headers.
type gzipResponseWriter struct {
	http.ResponseWriter
	Writer io.Writer
}

func (w *gzipResponseWriter) Write(p []byte) (int, error) {
	return w.Writer.Write(p)
}

// shouldCompress returns true for text-like payloads where gzip provides real savings.
func shouldCompress(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".html", ".htm", ".css", ".js", ".mjs", ".json", ".map", ".svg", ".txt":
		return true
	case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2":
		return false
	default:
		// Root paths or routes without an extension are likely HTML.
		return ext == ""
	}
}

// loadAssetManifest reads a JSON manifest mapping logical names to hashed assets.
func loadAssetManifest(path string) map[string]string {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("asset manifest not found (%s): %v", path, err)
		return nil
	}

	var manifest map[string]string
	if err := json.Unmarshal(data, &manifest); err != nil {
		log.Printf("asset manifest parse error: %v", err)
		return nil
	}
	return manifest
}

// resolveAssetPaths picks hashed assets when present, falling back to non-fingerprinted names.
func resolveAssetPaths(manifest map[string]string) builder.AssetPaths {
	assets := builder.AssetPaths{
		CSS: "/dist/app.css",
		JS:  "/dist/app.js",
	}
	if manifest == nil {
		return assets
	}
	if v := strings.TrimSpace(manifest["app.css"]); v != "" {
		assets.CSS = v
	}
	if v := strings.TrimSpace(manifest["app.js"]); v != "" {
		assets.JS = v
	}
	return assets
}
