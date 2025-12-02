package builder

import (
	"bytes"
	"html/template"
	"log"
	"net/http"

	"sft/internal/models"
	"sft/internal/services"
)

// AssetPaths holds the versioned asset URLs used by templates.
type AssetPaths struct {
	CSS string
	JS  string
}

// NewHandler builds an http.HandlerFunc with injected dependencies.
func NewHandler(loader services.UnitsSource, templates *template.Template, staticBase, canonical string, assets AssetPaths) http.HandlerFunc {
	logger := log.Default()

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")

		unitsData, err := loader.LoadUnits(r.Context())
		if err != nil {
			logger.Printf("Error loading units: %v", err)
			unitsData = &models.UnitsData{Units: []models.Unit{}}
		}

		board := models.NewBoardView(4, 7)

		data := struct {
			Board      models.BoardView
			Units      []models.Unit
			StaticBase string
			Canonical  string
			Assets     AssetPaths
		}{
			Board:      board,
			Units:      unitsData.Units,
			StaticBase: staticBase,
			Canonical:  canonical,
			Assets:     assets,
		}

		var buf bytes.Buffer
		if err := templates.ExecuteTemplate(&buf, "builder.gohtml", data); err != nil {
			logger.Printf("Template error: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		_, _ = w.Write(buf.Bytes())
	}
}
