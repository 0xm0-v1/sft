package httpx

import (
	"fmt"
	"net/http"
	"strings"

	"sft/internal/config"
	"sft/internal/features/builder"
	"sft/internal/middleware"
)

// NewRouter creates a router with default production dependencies.
// For testing or custom setups, use NewRouterWithDeps.
func NewRouter(cfg config.Config) (http.Handler, error) {
	return NewRouterWithDeps(cfg, NewDefaultDeps(cfg))
}

// NewRouterWithDeps wires the provided dependencies into an http.Handler.
// This enables dependency injection for testing and flexibility.
func NewRouterWithDeps(cfg config.Config, deps Deps) (http.Handler, error) {
	tmpl, err := deps.Templates.Load()
	if err != nil {
		return nil, err
	}

	canonical := buildCanonicalURL(cfg.SiteURL)
	assets := deps.Assets.Resolve()

	mux := http.NewServeMux()
	mux.HandleFunc("/", builder.NewHandler(deps.Units, tmpl, cfg.StaticBaseURL, canonical, assets))
	mux.HandleFunc("/robots.txt", serveRobots)
	mux.Handle(cfg.StaticBaseURL+"/", staticFileHandler(cfg))

	return middleware.Gzip(mux), nil
}

// buildCanonicalURL normalizes the site URL for use in templates.
func buildCanonicalURL(siteURL string) string {
	canonical := strings.TrimRight(siteURL, "/")
	if canonical != "" {
		canonical += "/"
	}
	return canonical
}

// staticFileHandler creates a handler for serving static files with caching.
func staticFileHandler(cfg config.Config) http.Handler {
	fs := http.FileServer(http.Dir("./static"))

	return http.StripPrefix(cfg.StaticBaseURL+"/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCacheHeaders(w, cfg.StaticCacheSec)
		fs.ServeHTTP(w, r)
	}))
}

// setCacheHeaders sets appropriate cache headers based on configuration.
func setCacheHeaders(w http.ResponseWriter, cacheSec int) {
	if cacheSec <= 0 {
		w.Header().Set("Cache-Control", "no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
	} else {
		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", cacheSec))
	}
}

// serveRobots exposes a root-level robots.txt.
func serveRobots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	http.ServeFile(w, r, "static/robots.txt")
}
