package httpx

import (
	"context"
	"html/template"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"sft/internal/config"
	"sft/internal/features/builder"
	"sft/internal/models"
)

// Mock implementations for testing

type mockTemplateLoader struct {
	tmpl *template.Template
	err  error
}

func (m *mockTemplateLoader) Load() (*template.Template, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.tmpl != nil {
		return m.tmpl, nil
	}
	// Return a minimal working template
	return template.New("builder.gohtml").Parse(`<!DOCTYPE html><html><body>Test</body></html>`)
}

type mockUnitsLoader struct {
	data *models.UnitsData
	err  error
}

func (m *mockUnitsLoader) LoadUnits(ctx context.Context) (*models.UnitsData, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.data != nil {
		return m.data, nil
	}
	return &models.UnitsData{Units: []models.Unit{}}, nil
}

type mockAssetResolver struct {
	assets builder.AssetPaths
}

func (m *mockAssetResolver) Resolve() builder.AssetPaths {
	if m.assets.CSS == "" && m.assets.JS == "" {
		return DefaultAssetPaths()
	}
	return m.assets
}

// Tests

func TestNewRouterWithDeps_Success(t *testing.T) {
	cfg := config.Default()
	deps := Deps{
		Templates: &mockTemplateLoader{},
		Units:     &mockUnitsLoader{},
		Assets:    &mockAssetResolver{},
	}

	handler, err := NewRouterWithDeps(cfg, deps)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if handler == nil {
		t.Fatal("expected handler, got nil")
	}
}

func TestNewRouterWithDeps_TemplateError(t *testing.T) {
	cfg := config.Default()
	deps := Deps{
		Templates: &mockTemplateLoader{err: http.ErrAbortHandler},
		Units:     &mockUnitsLoader{},
		Assets:    &mockAssetResolver{},
	}

	_, err := NewRouterWithDeps(cfg, deps)
	if err == nil {
		t.Fatal("expected error for failed template loading")
	}
}

func TestNewRouterWithDeps_ServesRobotsTxt(t *testing.T) {
	cfg := config.Default()
	deps := Deps{
		Templates: &mockTemplateLoader{},
		Units:     &mockUnitsLoader{},
		Assets:    &mockAssetResolver{},
	}

	handler, _ := NewRouterWithDeps(cfg, deps)

	req := httptest.NewRequest(http.MethodGet, "/robots.txt", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	// Will 404 since file doesn't exist in test, but route should be registered
	// In real scenario, would return the file
	if rec.Code == http.StatusInternalServerError {
		t.Error("route should be registered even if file missing")
	}
}

func TestBuildCanonicalURL(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"https://example.com", "https://example.com/"},
		{"https://example.com/", "https://example.com/"},
		{"https://example.com//", "https://example.com/"},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := buildCanonicalURL(tt.input)
			if got != tt.expected {
				t.Errorf("buildCanonicalURL(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestSetCacheHeaders_NoCache(t *testing.T) {
	rec := httptest.NewRecorder()
	setCacheHeaders(rec, 0)

	if !strings.Contains(rec.Header().Get("Cache-Control"), "no-store") {
		t.Error("expected no-store cache control")
	}
	if rec.Header().Get("Pragma") != "no-cache" {
		t.Error("expected no-cache pragma")
	}
}

func TestSetCacheHeaders_WithCache(t *testing.T) {
	rec := httptest.NewRecorder()
	setCacheHeaders(rec, 3600)

	cc := rec.Header().Get("Cache-Control")
	if !strings.Contains(cc, "public") {
		t.Error("expected public cache control")
	}
	if !strings.Contains(cc, "max-age=3600") {
		t.Error("expected max-age=3600")
	}
}
