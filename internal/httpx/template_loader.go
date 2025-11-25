package httpx

import (
	"fmt"
	"html/template"

	tmplhelpers "sft/internal/httpx/templates"
)

// FileTemplateLoader loads templates from the filesystem.
type FileTemplateLoader struct {
	Pattern string // Glob pattern, e.g. "templates/**/*.gohtml"
}

// NewFileTemplateLoader creates a loader with the default pattern.
func NewFileTemplateLoader() *FileTemplateLoader {
	return &FileTemplateLoader{
		Pattern: "templates/**/*.gohtml",
	}
}

// Load parses all templates matching the pattern.
func (l *FileTemplateLoader) Load() (*template.Template, error) {
	tmpl, err := template.New("").Funcs(tmplhelpers.Funcs()).ParseGlob(l.Pattern)
	if err != nil {
		return nil, fmt.Errorf("template loading failed: %w", err)
	}
	return tmpl, nil
}
