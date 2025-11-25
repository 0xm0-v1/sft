package httpx

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"

	"sft/internal/config"
	"sft/internal/features/builder"
	tmplhelpers "sft/internal/httpx/templates"
	"sft/internal/middleware"
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

	return middleware.Gzip(mux), nil
}

// serveRobots exposes a root-level robots.txt (served from ./static/robots.txt).
func serveRobots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	http.ServeFile(w, r, "static/robots.txt")
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
