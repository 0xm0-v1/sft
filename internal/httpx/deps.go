// Package httpx provides HTTP routing and handlers.
package httpx

import (
	"context"
	"html/template"

	"sft/internal/features/builder"
	"sft/internal/models"
)

// TemplateLoader loads and parses HTML templates.
type TemplateLoader interface {
	Load() (*template.Template, error)
}

// UnitsLoader provides access to unit data.
type UnitsLoader interface {
	LoadUnits(ctx context.Context) (*models.UnitsData, error)
}

// AssetResolver resolves versioned asset paths from a manifest.
type AssetResolver interface {
	Resolve() builder.AssetPaths
}

// Deps holds all dependencies required by the router.
// This enables dependency injection and easier testing.
type Deps struct {
	Templates TemplateLoader
	Units     UnitsLoader
	Assets    AssetResolver
}
