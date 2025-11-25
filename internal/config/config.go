package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds runtime configuration for the app.
type Config struct {
	Port           string        // http listen address, e.g. ":8080"
	SetDataPath    string        // path to generated set JSON
	TraitAssetsDir string        // path to trait SVG assets
	UnitAssetsDir  string        // path to unit image assets
	SpellAssetsDir string        // path to spell/ability icons
	StaticBaseURL  string        // base URL for serving static files
	StaticCacheSec int           // cache max-age for static files (seconds); 0 disables caching
	SiteURL        string        // absolute site URL for canonical/meta (e.g., https://example.com)
	HTTPTimeout    time.Duration // default HTTP timeout for outbound calls
}

func Default() Config {
	return Config{
		Port:           ":8080",
		SetDataPath:    "data/set16_champions.json",
		TraitAssetsDir: "static/assets/Traits/SET16",
		UnitAssetsDir:  "static/assets/Units/SET16",
		SpellAssetsDir: "static/assets/Spells/SET16/webp-64",
		StaticBaseURL:  "/static",
		StaticCacheSec: 0, // default to no cache in dev; set STATIC_CACHE_SECONDS in prod
		SiteURL:        "http://localhost:8080",
		HTTPTimeout:    20 * time.Second,
	}
}

// Load builds a Config from environment variables, falling back to defaults.
// This keeps configuration explicit while preserving current behavior.
func Load() Config {
	cfg := Default()

	if v := os.Getenv("PORT"); v != "" {
		cfg.Port = ensurePortFormat(v)
	}
	if v := os.Getenv("SET_DATA_PATH"); v != "" {
		cfg.SetDataPath = v
	}
	if v := os.Getenv("TRAIT_ASSETS_DIR"); v != "" {
		cfg.TraitAssetsDir = v
	}
	if v := os.Getenv("UNIT_ASSETS_DIR"); v != "" {
		cfg.UnitAssetsDir = v
	}
	if v := os.Getenv("SPELL_ASSETS_DIR"); v != "" {
		cfg.SpellAssetsDir = v
	}
	if v := os.Getenv("STATIC_BASE_URL"); v != "" {
		cfg.StaticBaseURL = v
	}
	if v := os.Getenv("STATIC_CACHE_SECONDS"); v != "" {
		if seconds, err := strconv.Atoi(v); err == nil && seconds >= 0 {
			cfg.StaticCacheSec = seconds
		}
	}
	if v := os.Getenv("SITE_URL"); v != "" {
		cfg.SiteURL = v
	}
	if v := os.Getenv("HTTP_TIMEOUT_SECONDS"); v != "" {
		if seconds, err := strconv.Atoi(v); err == nil && seconds > 0 {
			cfg.HTTPTimeout = time.Duration(seconds) * time.Second
		}
	}

	return cfg
}

// ensurePortFormat accepts "8080" or ":8080" and always returns ":port".
func ensurePortFormat(port string) string {
	if port == "" {
		return ":8080"
	}
	if port[0] == ':' {
		return port
	}
	return ":" + port
}
