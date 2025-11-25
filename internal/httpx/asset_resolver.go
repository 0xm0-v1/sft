package httpx

import (
	"encoding/json"
	"log"
	"os"
	"strings"

	"sft/internal/features/builder"
)

// DefaultAssetPaths returns fallback paths when no manifest is available.
func DefaultAssetPaths() builder.AssetPaths {
	return builder.AssetPaths{
		CSS: "/dist/app.css",
		JS:  "/dist/app.js",
	}
}

// ManifestAssetResolver resolves asset paths from a JSON manifest file.
type ManifestAssetResolver struct {
	ManifestPath string
	Defaults     builder.AssetPaths
}

// NewManifestAssetResolver creates a resolver with standard defaults.
func NewManifestAssetResolver(manifestPath string) *ManifestAssetResolver {
	return &ManifestAssetResolver{
		ManifestPath: manifestPath,
		Defaults:     DefaultAssetPaths(),
	}
}

// Resolve reads the manifest and returns versioned asset paths.
// Falls back to defaults if the manifest is missing or invalid.
func (r *ManifestAssetResolver) Resolve() builder.AssetPaths {
	manifest := r.loadManifest()
	return r.resolveFromManifest(manifest)
}

func (r *ManifestAssetResolver) loadManifest() map[string]string {
	data, err := os.ReadFile(r.ManifestPath)
	if err != nil {
		log.Printf("asset manifest not found (%s): %v", r.ManifestPath, err)
		return nil
	}

	var manifest map[string]string
	if err := json.Unmarshal(data, &manifest); err != nil {
		log.Printf("asset manifest parse error: %v", err)
		return nil
	}
	return manifest
}

func (r *ManifestAssetResolver) resolveFromManifest(manifest map[string]string) builder.AssetPaths {
	assets := r.Defaults

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

// StaticAssetResolver always returns fixed asset paths (useful for testing).
type StaticAssetResolver struct {
	Assets builder.AssetPaths
}

// Resolve returns the static asset paths.
func (r *StaticAssetResolver) Resolve() builder.AssetPaths {
	return r.Assets
}
