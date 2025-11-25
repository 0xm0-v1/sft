package httpx

import (
	"sft/internal/config"
	"sft/internal/services"
)

// NewDefaultDeps creates the standard production dependencies from config.
func NewDefaultDeps(cfg config.Config) Deps {
	return Deps{
		Templates: NewFileTemplateLoader(),
		Units: services.NewUnitsLoader(services.LoadUnitsConfig{
			SetDataPath: cfg.SetDataPath,
			TraitDir:    cfg.TraitAssetsDir,
			UnitDir:     cfg.UnitAssetsDir,
			SpellDir:    cfg.SpellAssetsDir,
		}),
		Assets: NewManifestAssetResolver("static/dist/manifest.json"),
	}
}
